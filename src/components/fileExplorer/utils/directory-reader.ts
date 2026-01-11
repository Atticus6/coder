import { getMimeType, isBinaryFile } from "@/lib/file-utils";
import type { FileTreeItem } from "../types";

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
        result.push({ name: e.name, type: "file", mimeType, file });
      } else {
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

// 处理外部拖放的文件/文件夹
export async function processDroppedItems(
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
        fileItems.push({ name: entry.name, type: "file", mimeType, file });
      } else {
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
