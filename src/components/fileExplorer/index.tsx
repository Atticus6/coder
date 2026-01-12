import type { FileTreeNode } from "!/rpc/file";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
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
import { orpcClient } from "@/lib/orpc";
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
import { ScrollArea } from "../ui/scroll-area";
import { CreateInput } from "./create-input";
import { DeleteProjectDialog, RenameProjectDialog } from "./project-dialogs";
import { TreeItem } from "./tree-item";
import { processDroppedItems } from "./utils/directory-reader";
import { uploadFileTree } from "./utils/file-upload";

// 从服务器数据收集展开的文件夹 ID
function collectExpandedIds(nodes: FileTreeNode[]): number[] {
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
}

function FileExplorer({ projectId }: { projectId: number }) {
  const [isOpen, setIsOpen] = useState(true);
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const [isDragOverRoot, setIsDragOverRoot] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [initialized, setInitialized] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { openFile, closeTab, openTabs } = useEditor(projectId);

  const { data: project } = useSuspenseQuery(
    orpcClient.project.getById.queryOptions({
      input: projectId,
      refetchInterval(query) {
        return query.state.data?.importStatus === "importing" ? 1500 : false;
      },
    }),
  );

  const { data: fileTree } = useSuspenseQuery(
    orpcClient.file.getFileTree.queryOptions({
      input: { projectId },
      refetchInterval: project.importStatus === "importing" ? 1500 : false,
    }),
  );

  // 初始化展开状态
  if (!initialized && fileTree) {
    setExpandedIds(new Set(collectExpandedIds(fileTree)));
    setInitialized(true);
  }

  const invalidateFileTree = () => {
    queryClient.invalidateQueries({
      queryKey: orpcClient.file.getFileTree.queryKey({ input: { projectId } }),
    });
  };

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

  const invalidateAllOpenTabPaths = () => {
    for (const fileId of openTabs) {
      queryClient.invalidateQueries({
        queryKey: orpcClient.file.getPathById.queryKey({ input: fileId }),
      });
    }
  };

  // Mutations
  const renameProjectMutation = useMutation(
    orpcClient.project.rename.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpcClient.project.getById.queryKey({ input: projectId }),
        });
        setRenameOpen(false);
        toast.success("项目已重命名");
      },
      onError: (error) =>
        toast.error("重命名失败", { description: error.message }),
    }),
  );

  const deleteProjectMutation = useMutation(
    orpcClient.project.remove.mutationOptions({
      onSuccess: () => {
        toast.success("项目已删除");
        navigate({ to: "/" });
      },
      onError: (error) =>
        toast.error("删除失败", { description: error.message }),
    }),
  );

  const { mutate: updateOpen } = useMutation(
    orpcClient.file.updateOpen.mutationOptions(),
  );

  const { mutate: collapseAllMutate } = useMutation(
    orpcClient.file.collapseAll.mutationOptions(),
  );

  const { mutate: createFile } = useMutation(
    orpcClient.file.create.mutationOptions({
      onSuccess: (data, variables) => {
        if (data.createdFolderIds.length > 0) {
          setExpandedIds((prev) => {
            const next = new Set(prev);
            for (const id of data.createdFolderIds) next.add(id);
            return next;
          });
        }
        invalidateFileTree();
        if (variables.type === "file") openFile(data.id, { pinned: true });
      },
    }),
  );

  const { mutate: renameFile } = useMutation(
    orpcClient.file.rename.mutationOptions({
      onSuccess: (data, variables) => {
        if (data.createdFolderIds.length > 0) {
          setExpandedIds((prev) => {
            const next = new Set(prev);
            for (const id of data.createdFolderIds) next.add(id);
            return next;
          });
        }
        invalidateFileTree();
        invalidateFileQueries(variables.id);
        invalidateAllOpenTabPaths();
      },
    }),
  );

  const { mutate: deleteFile } = useMutation(
    orpcClient.file.remove.mutationOptions({
      onSuccess: (_, variables) => {
        invalidateFileTree();
        closeTab(variables.id);
      },
    }),
  );

  const { mutate: moveFile } = useMutation(
    orpcClient.file.move.mutationOptions({
      onSuccess: (_, variables) => {
        invalidateFileTree();
        invalidateFileQueries(variables.id);
        invalidateAllOpenTabPaths();
      },
    }),
  );

  // Handlers
  const handleToggleExpand = (folderId: number, isOpenState: boolean) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      isOpenState ? next.add(folderId) : next.delete(folderId);
      return next;
    });
    updateOpen({ id: folderId, isOpen: isOpenState });
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
    collapseAllMutate({ projectId });
  };

  const handleCreateFile = (
    parentId: number | undefined,
    name: string,
    type: "file" | "folder",
  ) => createFile({ projectId, name, type, parentId });

  const handleRename = (fileId: number, name: string) =>
    renameFile({ id: fileId, name, projectId });

  const handleDelete = (fileId: number) => deleteFile({ id: fileId });

  const handleMove = (fileId: number, parentId: number | null) =>
    moveFile({ id: fileId, parentId });

  const handleCreate = (name: string) => {
    if (!creating) return;
    createFile({ projectId, name, type: creating });
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

  const handleRootDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOverRoot(false);

    const draggedId = e.dataTransfer.getData("application/x-file-id");
    if (draggedId) {
      handleMove(Number(draggedId), null);
      return;
    }

    if (e.dataTransfer.items.length > 0) {
      handleExternalDrop(null, e.dataTransfer.items);
    }
  };

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
              onClick={() => setIsOpen((v) => !v)}
              onDragOver={handleRootDragOver}
              onDragLeave={() => setIsDragOverRoot(false)}
              onDrop={handleRootDrop}
              className={cn(
                "group/project flex h-5 w-full cursor-pointer items-center gap-0.5 text-left font-bold",
                isDragOverRoot && "bg-accent",
              )}
            >
              <ChevronRightIcon
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform",
                  isOpen && "rotate-90",
                )}
              />
              <p className="line-clamp-1 text-xs uppercase">{project.name}</p>
              <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-none duration-0 group-hover/project:opacity-100">
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
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
                setNewProjectName(project.name);
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

      <RenameProjectDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        projectName={newProjectName}
        onProjectNameChange={setNewProjectName}
        onConfirm={handleRenameProject}
        isPending={renameProjectMutation.isPending}
      />

      <DeleteProjectDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        projectName={project.name}
        onConfirm={() => deleteProjectMutation.mutate(projectId)}
        isPending={deleteProjectMutation.isPending}
      />
    </div>
  );
}

export default FileExplorer;
