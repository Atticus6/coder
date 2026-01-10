interface Props {
  fileName: string;
  content: string;
  mimeType?: string | null;
  fileUrl?: string | null;
}

// 根据文件扩展名获取 MIME 类型
function getMimeTypeFromFileName(fileName: string): string {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
  const mimeTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".ico": "image/x-icon",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".svg": "image/svg+xml",
  };
  return mimeTypes[ext] || "image/png";
}

function ImagePreview({ fileName, content, mimeType, fileUrl }: Props) {
  const actualMimeType = mimeType || getMimeTypeFromFileName(fileName);
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
