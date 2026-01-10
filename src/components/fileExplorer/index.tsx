import type { FileTreeNode } from "!/rpc/file";
import { FileIcon, FolderIcon } from "@react-symbols/icons/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ChevronRightIcon,
  CopyMinusIcon,
  FilePlusCornerIcon,
  FolderPlusIcon,
  LoaderIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";
import { type DragEvent, useState } from "react";
import { toast } from "sonner";
import { getMimeType, isBinaryFile } from "@/lib/file-utils";
import { client, orpcClient } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { useEditor } from "../editor/store/use-editor";
import { Button } from "../ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { getItemPadding } from "./constants";
import { CreateInput } from "./create-input";
import { RenameInput } from "./rename-input";

// 文件树节点类型
type FileTreeItem = {
  name: string;
  type: "file" | "folder";
  content?: string;
  mimeType?: string;
  fileUrl?: string;
  file?: File; // 原始文件对象，用于二进制文件上传
  children?: FileTreeItem[];
};

// 上传二进制文件到存储服务
async function uploadBinaryFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("文件上传失败");
  }

  const results = await response.json();
  return results[0].url;
}

// 递归读取文件夹所有内容
async function readAllDirectoryEntries(
  reader: FileSystemDirectoryReader,
): Promise<FileSystemEntry[]> {
  const entries: FileSystemEntry[] = [];
  let batch: FileSystemEntry[];

  do {
    batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    entries.push(...batch);
  } while (batch.length > 0);

  return entries;
}

// 递归读取文件夹内容
async function readDirectoryEntry(
  entry: FileSystemDirectoryEntry,
): Promise<FileTreeItem[]> {
  const result: FileTreeItem[] = [];
  const reader = entry.createReader();
  const entries = await readAllDirectoryEntries(reader);

  for (const e of entries) {
    if (e.isFile) {
      const file = await new Promise<File>((resolve, reject) => {
        (e as FileSystemFileEntry).file(resolve, reject);
      });
      const mimeType = getMimeType(e.name);

      if (isBinaryFile(e.name)) {
        // 二进制文件保存原始 File 对象，稍后上传
        result.push({ name: e.name, type: "file", mimeType, file });
      } else {
        // 文本文件直接读取内容
        const content = await file.text();
        result.push({ name: e.name, type: "file", content, mimeType });
      }
    } else if (e.isDirectory) {
      const children = await readDirectoryEntry(e as FileSystemDirectoryEntry);
      result.push({ name: e.name, type: "folder", children });
    }
  }

  return result;
}

// 递归上传文件结构
async function uploadFileTree(
  projectId: number,
  parentId: number | undefined,
  items: FileTreeItem[],
) {
  for (const item of items) {
    let fileUrl: string | undefined;

    // 如果是二进制文件，先上传到存储服务
    if (item.file) {
      fileUrl = await uploadBinaryFile(item.file);
    }

    const result = await client.file.create({
      projectId,
      parentId,
      name: item.name,
      type: item.type,
      content: item.content,
      mimeType: item.mimeType,
      fileUrl,
    });

    if (item.type === "folder" && item.children) {
      await uploadFileTree(projectId, result.id, item.children);
    }
  }
}

// 处理外部拖放的文件/文件夹
async function processDroppedItems(
  items: DataTransferItemList,
): Promise<FileTreeItem[]> {
  const fileItems: FileTreeItem[] = [];

  // 必须同步获取所有 entry，否则异步后会失效
  const entries: FileSystemEntry[] = [];
  for (const item of Array.from(items)) {
    if (item.kind === "file") {
      const entry = item.webkitGetAsEntry();
      if (entry) entries.push(entry);
    }
  }

  for (const entry of entries) {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => {
        (entry as FileSystemFileEntry).file(resolve, reject);
      });
      const mimeType = getMimeType(entry.name);

      if (isBinaryFile(entry.name)) {
        // 二进制文件保存原始 File 对象
        fileItems.push({ name: entry.name, type: "file", mimeType, file });
      } else {
        // 文本文件直接读取内容
        const content = await file.text();
        fileItems.push({ name: entry.name, type: "file", content, mimeType });
      }
    } else if (entry.isDirectory) {
      const children = await readDirectoryEntry(
        entry as FileSystemDirectoryEntry,
      );
      fileItems.push({ name: entry.name, type: "folder", children });
    }
  }

  return fileItems;
}

interface TreeItemProps {
  item: FileTreeNode;
  level: number;
  projectId: number;
  expandedIds: Set<number>;
  onToggleExpand: (id: number, isOpen: boolean) => void;
  onCreateFile: (
    parentId: number | undefined,
    name: string,
    type: "file" | "folder",
  ) => void;
  onRename: (id: number, name: string) => void;
  onDelete: (id: number) => void;
  onMove: (id: number, parentId: number | null) => void;
  onExternalDrop: (
    parentId: number | null,
    items: DataTransferItemList,
  ) => void;
  openFile: (
    fileId: number,
    options: {
      pinned: boolean;
    },
  ) => void;
}

function TreeItem({
  item,
  level,
  projectId,
  expandedIds,
  onToggleExpand,
  onCreateFile,
  onRename,
  onDelete,
  onMove,
  onExternalDrop,
  openFile,
}: TreeItemProps) {
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const isOpen = expandedIds.has(item.id);

  const handleCreate = (name: string) => {
    if (!creating) return;
    onCreateFile(item.id, name, creating);
    setCreating(null);
  };

  const handleRename = (name: string) => {
    onRename(item.id, name);
    setIsRenaming(false);
  };

  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer.setData("application/x-file-id", String(item.id));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: DragEvent) => {
    if (item.type !== "folder") return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // 检查是否是内部拖拽
    const draggedId = e.dataTransfer.getData("application/x-file-id");
    if (draggedId) {
      const id = Number(draggedId);
      if (id && id !== item.id) {
        onMove(id, item.id);
        if (!isOpen) onToggleExpand(item.id, true);
      }
      return;
    }

    // 外部文件拖放
    if (e.dataTransfer.items.length > 0) {
      onExternalDrop(item.id, e.dataTransfer.items);
      if (!isOpen) onToggleExpand(item.id, true);
    }
  };

  if (item.type === "file") {
    if (isRenaming) {
      return (
        <RenameInput
          type="file"
          level={level}
          initialName={item.name}
          onSubmit={handleRename}
          onCancel={() => setIsRenaming(false)}
        />
      );
    }

    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            draggable
            onDragStart={handleDragStart}
            className="flex h-5.5 w-full cursor-pointer items-center gap-1 hover:bg-accent/50"
            style={{ paddingLeft: getItemPadding(level, true) }}
            onClick={() => {
              openFile(item.id, { pinned: false });
              console.log("点击了");
            }}
          >
            <FileIcon
              fileName={item.name}
              autoAssign
              className="size-4 shrink-0"
            />
            <span className="line-clamp-1 text-sm">{item.name}</span>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => setIsRenaming(true)}>
            <PencilIcon className="size-3.5" />
            重命名
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            variant="destructive"
            onClick={() => onDelete(item.id)}
          >
            <TrashIcon className="size-3.5" />
            删除
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            draggable={!isRenaming}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              onToggleExpand(item.id, !isOpen);
            }}
            className={cn(
              "group/folder flex h-5.5 w-full cursor-pointer items-center gap-0.5 hover:bg-accent/50",
              isDragOver && "bg-accent",
            )}
            style={{ paddingLeft: getItemPadding(level, false) }}
          >
            {isRenaming ? (
              <RenameInput
                type="folder"
                level={level}
                initialName={item.name}
                onSubmit={handleRename}
                onCancel={() => setIsRenaming(false)}
                inline
              />
            ) : (
              <>
                <ChevronRightIcon
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform",
                    isOpen && "rotate-90",
                  )}
                />
                <FolderIcon
                  className="size-4 shrink-0"
                  folderName={item.name}
                />
                <span className="line-clamp-1 text-sm">{item.name}</span>

                <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover/folder:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isOpen) onToggleExpand(item.id, true);
                      setCreating("file");
                    }}
                  >
                    <FilePlusCornerIcon className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isOpen) onToggleExpand(item.id, true);
                      setCreating("folder");
                    }}
                  >
                    <FolderPlusIcon className="size-3.5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onClick={() => {
              if (!isOpen) onToggleExpand(item.id, true);
              setCreating("file");
            }}
          >
            <FilePlusCornerIcon className="size-3.5" />
            新建文件
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              if (!isOpen) onToggleExpand(item.id, true);
              setCreating("folder");
            }}
          >
            <FolderPlusIcon className="size-3.5" />
            新建文件夹
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => setIsRenaming(true)}>
            <PencilIcon className="size-3.5" />
            重命名
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            variant="destructive"
            onClick={() => onDelete(item.id)}
          >
            <TrashIcon className="size-3.5" />
            删除
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {isOpen && (
        <>
          {creating && (
            <CreateInput
              type={creating}
              level={level + 1}
              onSubmit={handleCreate}
              onCancel={() => setCreating(null)}
            />
          )}
          {item.children?.map((child) => (
            <TreeItem
              key={child.id}
              item={child}
              level={level + 1}
              projectId={projectId}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onCreateFile={onCreateFile}
              onRename={onRename}
              onDelete={onDelete}
              onMove={onMove}
              onExternalDrop={onExternalDrop}
              openFile={openFile}
            />
          ))}
        </>
      )}
    </div>
  );
}

function FileExplorer({ projectId }: { projectId: number }) {
  const [isOpen, setIsOpen] = useState(true);
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const [isDragOverRoot, setIsDragOverRoot] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // 本地维护展开状态
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [initialized, setInitialized] = useState(false);
  // 项目重命名和删除
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { openFile, closeTab, openTabs } = useEditor(projectId);

  const { data: project } = useQuery(
    orpcClient.project.getById.queryOptions({ input: projectId }),
  );

  const { data: fileTree } = useQuery(
    orpcClient.file.getFileTree.queryOptions({ input: { projectId } }),
  );

  // 项目重命名
  const renameProjectMutation = useMutation(
    orpcClient.project.rename.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpcClient.project.getById.queryKey({ input: projectId }),
        });
        setRenameOpen(false);
        toast.success("项目已重命名");
      },
      onError: (error) => {
        toast.error("重命名失败", { description: error.message });
      },
    }),
  );

  // 项目删除
  const deleteProjectMutation = useMutation(
    orpcClient.project.remove.mutationOptions({
      onSuccess: () => {
        toast.success("项目已删除");
        navigate({ to: "/" });
      },
      onError: (error) => {
        toast.error("删除失败", { description: error.message });
      },
    }),
  );

  const handleRenameProject = () => {
    if (newProjectName.trim() && newProjectName !== project?.name) {
      renameProjectMutation.mutate({
        id: projectId,
        name: newProjectName.trim(),
      });
    } else {
      setRenameOpen(false);
    }
  };

  const handleDeleteProject = () => {
    deleteProjectMutation.mutate(projectId);
  };

  // 从服务器数据初始化展开状态
  if (!initialized && fileTree) {
    const collectExpandedIds = (nodes: FileTreeNode[]): number[] => {
      const ids: number[] = [];
      for (const node of nodes) {
        if (node.type === "folder" && node.isOpen) {
          ids.push(node.id);
        }
        if (node.children) {
          ids.push(...collectExpandedIds(node.children));
        }
      }
      return ids;
    };
    setExpandedIds(new Set(collectExpandedIds(fileTree)));
    setInitialized(true);
  }

  const invalidateFileTree = () => {
    queryClient.invalidateQueries({
      queryKey: orpcClient.file.getFileTree.queryKey({
        input: { projectId },
      }),
    });
  };

  // 使文件名和路径查询失效（用于重命名和删除后更新标签页显示）
  const invalidateFileQueries = (fileId: number) => {
    queryClient.invalidateQueries({
      queryKey: orpcClient.file.getNameById.queryKey({ input: fileId }),
    });
    queryClient.invalidateQueries({
      queryKey: orpcClient.file.getPathById.queryKey({ input: fileId }),
    });
    queryClient.invalidateQueries({
      queryKey: orpcClient.file.getById.queryKey({ input: fileId }),
    });
  };

  // 使所有打开标签页的路径查询失效（用于文件夹重命名/移动后更新子文件的面包屑）
  const invalidateAllOpenTabPaths = () => {
    for (const fileId of openTabs) {
      queryClient.invalidateQueries({
        queryKey: orpcClient.file.getPathById.queryKey({ input: fileId }),
      });
    }
  };

  // 更新文件/文件夹的打开状态（异步保存，不等待）
  const { mutate: updateOpen } = useMutation(
    orpcClient.file.updateOpen.mutationOptions(),
  );

  // 批量关闭所有文件夹
  const { mutate: collapseAllMutate } = useMutation(
    orpcClient.file.collapseAll.mutationOptions(),
  );

  const { mutate: createFile } = useMutation(
    orpcClient.file.create.mutationOptions({
      onSuccess: (data, variables) => {
        // 把新创建的文件夹加到展开状态
        if (data.createdFolderIds.length > 0) {
          setExpandedIds((prev) => {
            const next = new Set(prev);
            for (const id of data.createdFolderIds) {
              next.add(id);
            }
            return next;
          });
        }
        invalidateFileTree();
        // 新建文件时自动打开并 pin 住
        if (variables.type === "file") {
          openFile(data.id, { pinned: true });
        }
      },
    }),
  );

  const { mutate: renameFile } = useMutation(
    orpcClient.file.rename.mutationOptions({
      onSuccess: (data, variables) => {
        // 把新创建的文件夹加到展开状态
        if (data.createdFolderIds.length > 0) {
          setExpandedIds((prev) => {
            const next = new Set(prev);
            for (const id of data.createdFolderIds) {
              next.add(id);
            }
            return next;
          });
        }
        invalidateFileTree();
        // 更新标签页显示的文件名
        invalidateFileQueries(variables.id);
        // 文件夹重命名时，更新所有子文件的面包屑路径
        invalidateAllOpenTabPaths();
      },
    }),
  );

  const { mutate: deleteFile } = useMutation(
    orpcClient.file.remove.mutationOptions({
      onSuccess: (_, variables) => {
        invalidateFileTree();
        // 关闭被删除文件的标签页
        closeTab(variables.id);
      },
    }),
  );

  const { mutate: moveFile } = useMutation(
    orpcClient.file.move.mutationOptions({
      onSuccess: (_, variables) => {
        invalidateFileTree();
        // 更新标签页显示的路径
        invalidateFileQueries(variables.id);
        // 文件夹移动时，更新所有子文件的面包屑路径
        invalidateAllOpenTabPaths();
      },
    }),
  );

  // 切换文件夹展开状态
  const handleToggleExpand = (folderId: number, isOpenState: boolean) => {
    // 本地立即更新
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (isOpenState) {
        next.add(folderId);
      } else {
        next.delete(folderId);
      }
      return next;
    });
    // 异步保存到数据库
    updateOpen({ id: folderId, isOpen: isOpenState });
  };

  // 收起所有文件夹
  const collapseAll = () => {
    setExpandedIds(new Set());
    collapseAllMutate({ projectId });
  };

  const handleCreateFile = (
    parentId: number | undefined,
    name: string,
    type: "file" | "folder",
  ) => {
    createFile({
      projectId,
      name,
      type,
      parentId,
    });
  };

  const handleRename = (fileId: number, name: string) => {
    renameFile({ id: fileId, name, projectId });
  };

  const handleDelete = (fileId: number) => {
    deleteFile({ id: fileId });
  };

  const handleMove = (fileId: number, parentId: number | null) => {
    moveFile({ id: fileId, parentId });
  };

  const handleCreate = (name: string) => {
    if (!creating) return;
    createFile({
      projectId,
      name,
      type: creating,
    });
    setCreating(null);
  };

  const handleExternalDrop = async (
    parentId: number | null,
    items: DataTransferItemList,
  ) => {
    setIsUploading(true);
    try {
      const fileItems = await processDroppedItems(items);

      if (fileItems.length > 0) {
        await uploadFileTree(projectId, parentId ?? undefined, fileItems);
        invalidateFileTree();
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRootDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOverRoot(true);
  };

  const handleRootDragLeave = () => {
    setIsDragOverRoot(false);
  };

  const handleRootDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOverRoot(false);

    // 检查是否是内部拖拽
    const draggedId = e.dataTransfer.getData("application/x-file-id");
    if (draggedId) {
      handleMove(Number(draggedId), null);
      return;
    }

    // 外部文件拖放
    if (e.dataTransfer.items.length > 0) {
      handleExternalDrop(null, e.dataTransfer.items);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-sidebar">
      {isUploading && (
        <div className="flex shrink-0 items-center gap-2 border-border/50 border-b px-2 py-1.5 text-muted-foreground text-xs">
          <LoaderIcon className="size-3.5 animate-spin" />
          上传中...
        </div>
      )}
      <ScrollArea className="flex-1 overflow-y-auto">
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              onClick={() => setIsOpen((value) => !value)}
              onDragOver={handleRootDragOver}
              onDragLeave={handleRootDragLeave}
              onDrop={handleRootDrop}
              className={cn(
                "group/project flex h-5.5 w-full cursor-pointer items-center gap-0.5 text-left font-bold",
                isDragOverRoot && "bg-accent",
              )}
            >
              <ChevronRightIcon
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform",
                  isOpen && "rotate-90",
                )}
              />

              <p className="line-clamp-1 text-xs uppercase">
                {project?.name ?? "Loading..."}
              </p>

              <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-none duration-0 group-hover/project:opacity-100">
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setIsOpen(true);
                    setCreating("file");
                  }}
                  size="icon-xs"
                >
                  <FilePlusCornerIcon className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setIsOpen(true);
                    setCreating("folder");
                  }}
                  size="icon-xs"
                >
                  <FolderPlusIcon className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    collapseAll();
                  }}
                  size="icon-xs"
                >
                  <CopyMinusIcon className="size-3.5" />
                </Button>
              </div>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem
              onClick={() => {
                setNewProjectName(project?.name ?? "");
                setRenameOpen(true);
              }}
            >
              <PencilIcon className="size-3.5" />
              重命名项目
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <TrashIcon className="size-3.5" />
              删除项目
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {isOpen && (
          <>
            {creating && (
              <CreateInput
                type={creating}
                level={0}
                onSubmit={handleCreate}
                onCancel={() => setCreating(null)}
              />
            )}
            {fileTree?.map((item) => (
              <TreeItem
                key={item.id}
                item={item}
                level={0}
                projectId={projectId}
                expandedIds={expandedIds}
                onToggleExpand={handleToggleExpand}
                onCreateFile={handleCreateFile}
                onRename={handleRename}
                onDelete={handleDelete}
                onMove={handleMove}
                onExternalDrop={handleExternalDrop}
                openFile={openFile}
              />
            ))}
          </>
        )}
      </ScrollArea>

      {/* 重命名项目对话框 */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名项目</DialogTitle>
          </DialogHeader>
          <Input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="项目名称"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameProject();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleRenameProject}
              disabled={renameProjectMutation.isPending}
            >
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除项目确认对话框 */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除项目</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            确定要删除项目 "{project?.name}" 吗？此操作不可撤销。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={deleteProjectMutation.isPending}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FileExplorer;
