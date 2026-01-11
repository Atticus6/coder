// 上传配置 - 前后端共享
export const UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/bmp",
    "image/x-icon",
    "image/avif",
    // 音频
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    // 视频
    "video/mp4",
    "video/webm",
    // 字体
    "font/woff",
    "font/woff2",
    "font/ttf",
    "font/otf",
    // 文档
    "application/pdf",
  ],
} as const;

// 扩展名到 MIME 类型的映射
export const EXT_TO_MIME: Record<string, string> = {
  // 图片
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".avif": "image/avif",
  // 音频
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  // 视频
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  // 字体
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  // 文档
  ".pdf": "application/pdf",
};

// 应该跳过的文件（二进制锁文件、编译产物等）
export const IGNORED_FILES = new Set(["bun.lockb", ".DS_Store", "Thumbs.db"]);

export const IGNORED_EXTENSIONS = new Set([
  ".lockb",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  ".dat",
  ".db",
  ".sqlite",
  ".sqlite3",
]);

/** 获取文件的 MIME 类型 */
export function getMimeType(fileName: string): string | null {
  const ext = getExtension(fileName);
  return EXT_TO_MIME[ext] ?? null;
}

/** 获取文件扩展名（小写） */
export function getExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot === -1 ? "" : fileName.slice(lastDot).toLowerCase();
}

/** 判断是否为支持的二进制文件 */
export function isBinaryFile(fileName: string): boolean {
  const mimeType = getMimeType(fileName);
  return (
    mimeType !== null && UPLOAD_CONFIG.allowedTypes.includes(mimeType as any)
  );
}

/** 判断是否应该忽略该文件 */
export function shouldIgnoreFile(fileName: string): boolean {
  if (IGNORED_FILES.has(fileName)) return true;
  const ext = getExtension(fileName);
  return IGNORED_EXTENSIONS.has(ext);
}

/** 校验文件大小 */
export function validateFileSize(size: number): {
  valid: boolean;
  error?: string;
} {
  if (size > UPLOAD_CONFIG.maxFileSize) {
    const maxMB = UPLOAD_CONFIG.maxFileSize / 1024 / 1024;
    return { valid: false, error: `文件大小超过限制 (最大 ${maxMB}MB)` };
  }
  return { valid: true };
}

/** 校验文件类型 */
export function validateFileType(type: string): {
  valid: boolean;
  error?: string;
} {
  if (
    !UPLOAD_CONFIG.allowedTypes.includes(
      type as (typeof UPLOAD_CONFIG.allowedTypes)[number],
    )
  ) {
    return { valid: false, error: `不支持的文件类型: ${type}` };
  }
  return { valid: true };
}

/** 清理文件名，防止路径遍历攻击 */
export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/** 校验单个文件 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const sizeResult = validateFileSize(file.size);
  if (!sizeResult.valid) return sizeResult;

  const typeResult = validateFileType(file.type);
  if (!typeResult.valid) return typeResult;

  return { valid: true };
}
