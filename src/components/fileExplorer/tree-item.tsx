import { FileIcon } from "@react-symbols/icons/utils";
import {
  ChevronRightIcon,
  FilePlusCornerIcon,
  FolderIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";
import { type DragEvent, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/context-menu";
import { getItemPadding } from "./constants";
import { CreateInput } from "./create-input";
import { RenameInput } from "./rename-input";
import type { TreeItemProps } from "./types";

export function TreeItem({
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

    const draggedId = e.dataTransfer.getData("application/x-file-id");
    if (draggedId) {
      const id = Number(draggedId);
      if (id && id !== item.id) {
        onMove(id, item.id);
        if (!isOpen) onToggleExpand(item.id, true);
      }
      return;
    }

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
            className="flex h-5 w-full cursor-pointer items-center gap-1 hover:bg-accent/50"
            style={{ paddingLeft: getItemPadding(level, true) }}
            onClick={() => openFile(item.id, { pinned: false })}
          >
            <FileIcon
              fileName={item.name}
              autoAssign
              className="size-4 shrink-0"
            />
            <span className="line-clamp-1 text-sm tracking-tighter">
              {item.name}
            </span>
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
            onClick={() => onToggleExpand(item.id, !isOpen)}
            className={cn(
              "group/folder flex h-5 w-full cursor-pointer items-center gap-0.5 hover:bg-accent/50",
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
                {isOpen ? (
                  <FolderOpenIcon className="size-4 shrink-0" />
                ) : (
                  <FolderIcon className="size-4 shrink-0" />
                )}
                <span className="line-clamp-1 text-sm tracking-tighter">
                  {item.name}
                </span>

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
