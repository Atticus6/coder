import { env } from "!/env";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
// 存储接口
export interface StorageProvider {
  upload(file: Buffer, fileName: string): Promise<string>;
  delete(fileUrl: string): Promise<void>;
  getPublicUrl(path: string): string;
}

// 本地存储（开发环境）
class LocalStorage implements StorageProvider {
  private uploadDir = resolve(process.cwd(), "public", "uploads");

  async upload(file: Buffer, fileName: string): Promise<string> {
    // 确保上传目录存在
    await mkdir(this.uploadDir, { recursive: true });

    // 生成唯一文件名
    const ext = extname(fileName);
    const uniqueName = `${randomUUID()}${ext}`;
    const filePath = join(this.uploadDir, uniqueName);

    // 写入文件
    await writeFile(filePath, file);

    // 返回相对路径
    return `/uploads/${uniqueName}`;
  }

  async delete(fileUrl: string): Promise<void> {
    if (!fileUrl.startsWith("/uploads/")) return;
    const relative = fileUrl.replace(/^\/uploads\//, "");
    const base = resolve(this.uploadDir);
    const filePath = resolve(this.uploadDir, relative);
    if (!filePath.startsWith(base + sep)) return;
    try {
      await unlink(filePath);
    } catch (e) {
      // 文件不存在时忽略错误
      const err = e as any;
      if (err?.code === "ENOENT") return;
      throw e;
    }
  }

  getPublicUrl(path: string): string {
    return path;
  }
}

// S3 存储（生产环境，后续实现）
class S3Storage implements StorageProvider {
  async upload(_file: Buffer, _fileName: string): Promise<string> {
    // TODO: 实现 S3 上传
    throw new Error("S3 storage not implemented yet");
  }

  async delete(_fileUrl: string): Promise<void> {
    // TODO: 实现 S3 删除
    throw new Error("S3 storage not implemented yet");
  }

  getPublicUrl(path: string): string {
    // TODO: 返回 S3 URL
    return path;
  }
}

// 根据环境选择存储提供者
export const storage: StorageProvider =
  env.NODE_ENV === "production" ? new S3Storage() : new LocalStorage();
