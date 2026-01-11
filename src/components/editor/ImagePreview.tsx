import { getMimeType } from "@/lib/file-utils";

interface Props {
  fileName: string;
  content: string;
  mimeType?: string | null;
  fileUrl?: string | null;
}

/**
 * Renders a centered, responsive preview for an image file from a URL or provided content.
 *
 * Uses `fileUrl` when present; otherwise uses `content` (as raw SVG text for SVG images or as base64 for other image types).
 *
 * @param content - File content: raw SVG text when the MIME type is `image/svg+xml`, otherwise base64-encoded image data
 * @param mimeType - Optional MIME type to use instead of inferring it from `fileName`
 * @param fileUrl - Optional absolute URL to use as the image source; when provided this takes precedence over `content`
 * @returns The rendered image preview element
 */
function ImagePreview({ fileName, content, mimeType, fileUrl }: Props) {
  const actualMimeType = mimeType || getMimeType(fileName) || "image/png";
  const isSvg = actualMimeType === "image/svg+xml";

  // 优先使用 fileUrl（存储服务的 URL）
  // 如果没有 fileUrl，则使用 content（SVG 文本或 base64）
  let src: string;
  if (fileUrl) {
    src = fileUrl;
  } else if (isSvg) {
    src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}`;
  } else {
    src = `data:${actualMimeType};base64,${content}`;
  }

  return (
    <div className="flex size-full items-center justify-center bg-background p-4">
      <img
        src={src}
        alt={fileName}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}

export default ImagePreview;
