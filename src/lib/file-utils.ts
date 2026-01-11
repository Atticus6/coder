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

/**
 * Get the file extension including the leading dot in lowercase.
 *
 * @returns The file extension including the leading dot in lowercase (for example, `.png`).
 */
export function getFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1 || dotIndex === 0) return "";
  return fileName.toLowerCase().slice(dotIndex);
}

/**
 * Determines whether the provided file name or path refers to a binary file.
 *
 * @param fileName - The file name or path to check
 * @returns `true` if the file's extension is recognized as binary, `false` otherwise
 */
export function isBinaryFile(fileName: string): boolean {
  return BINARY_EXTENSIONS.includes(getFileExtension(fileName));
}

/**
 * Determines whether a file should be treated as an image.
 *
 * @param fileName - The file name or path used to derive the file extension.
 * @param mimeType - Optional MIME type; when provided and starting with `image/`, it takes precedence.
 * @returns `true` if the file is an image, `false` otherwise.
 */
export function isImageFile(
  fileName: string,
  mimeType?: string | null,
): boolean {
  if (mimeType?.startsWith("image/")) return true;
  return IMAGE_EXTENSIONS.includes(getFileExtension(fileName));
}

/**
 * Resolve the MIME type for a file based on its extension.
 *
 * @returns The MIME type string for the file's extension, or `undefined` if unknown.
 */
export function getMimeType(fileName: string): string | undefined {
  return MIME_TYPES[getFileExtension(fileName)];
}
