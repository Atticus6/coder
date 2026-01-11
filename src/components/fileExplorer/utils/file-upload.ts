import { validateFile } from "#/upload-config";
import { client } from "@/lib/orpc";
import type { FileTreeItem } from "../types";

// 上传二进制文件到存储服务
export async function uploadBinaryFile(
  file: File,
  mimeType?: string,
): Promise<string> {
  const effectiveFile =
    file.type || !mimeType
      ? file
      : new File([file], file.name, { type: mimeType });

  const validation = validateFile(effectiveFile);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const formData = new FormData();
  formData.append("file", effectiveFile);
  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "文件上传失败");
  }

  const results = await response.json();
  const url = Array.isArray(results) ? results?.[0]?.url : results?.url;
  if (typeof url !== "string" || url.length === 0) {
    throw new Error("文件上传失败: 响应缺少 url");
  }
  return url;
}

// 递归上传文件结构
export async function uploadFileTree(
  projectId: number,
  parentId: number | undefined,
  items: FileTreeItem[],
) {
  for (const item of items) {
    let fileUrl: string | undefined;

    if (item.file) {
      fileUrl = await uploadBinaryFile(item.file, item.mimeType);
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
