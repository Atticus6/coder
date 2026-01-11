import type { FileTreeNode } from "!/rpc/file";

// 文件树节点类型
export type FileTreeItem = {
  name: string;
  type: "file" | "folder";
  content?: string;
  mimeType?: string;
  fileUrl?: string;
  file?: File; // 原始文件对象，用于二进制文件上传
  children?: FileTreeItem[];
};

export interface TreeItemProps {
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
