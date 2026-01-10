// 二进制文件扩展名
const BINARY_EXTENSIONS = [
  // 图片
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".ico",
  ".webp",
  ".avif",
  ".tiff",
  // 音频
  ".mp3",
  ".wav",
  ".ogg",
  ".flac",
  ".aac",
  // 视频
  ".mp4",
  ".webm",
  ".avi",
  ".mov",
  ".mkv",
  // 字体
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
  // 压缩文件
  ".zip",
  ".rar",
  ".7z",
  ".tar",
  ".gz",
  // 其他二进制
  ".pdf",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
];

// 图片扩展名
const IMAGE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".ico",
  ".webp",
  ".avif",
  ".svg",
];

// MIME 类型映射
const MIME_TYPES: Record<string, string> = {
  // 图片
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
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
};

/** 获取文件扩展名（小写） */
export function getFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1 || dotIndex === 0) return "";
  return fileName.toLowerCase().slice(dotIndex);
}

/** 判断是否为二进制文件 */
export function isBinaryFile(fileName: string): boolean {
  return BINARY_EXTENSIONS.includes(getFileExtension(fileName));
}

/** 判断是否为图片文件 */
export function isImageFile(
  fileName: string,
  mimeType?: string | null,
): boolean {
  if (mimeType?.startsWith("image/")) return true;
  return IMAGE_EXTENSIONS.includes(getFileExtension(fileName));
}

/** 获取文件的 MIME 类型 */
export function getMimeType(fileName: string): string | undefined {
  return MIME_TYPES[getFileExtension(fileName)];
}
