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
