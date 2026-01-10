import { FileIcon, FolderIcon } from "@react-symbols/icons/utils";
import { ChevronRightIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getItemPadding } from "./constants";

export const RenameInput = ({
  type,
  level,
  initialName,
  onSubmit,
  onCancel,
  inline = false,
}: {
  type: "file" | "folder";
  level: number;
  initialName: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
  inline?: boolean;
}) => {
  const [value, setValue] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 延迟聚焦，等待右键菜单关闭
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = () => {
    const trimmedValue = value.trim();
    if (trimmedValue && trimmedValue !== initialName) {
      onSubmit(trimmedValue);
    } else {
      onCancel();
    }
  };

  if (inline) {
    return (
      <div className="flex flex-1 items-center gap-0.5">
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
        <FolderIcon className="size-4 shrink-0" folderName={value} />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none focus:ring-1 focus:ring-ring focus:ring-inset"
          onBlur={handleSubmit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") {
              handleSubmit();
            }
            if (e.key === "Escape") {
              onCancel();
            }
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-5.5 w-full items-center gap-1 bg-accent/30"
      style={{ paddingLeft: getItemPadding(level, type === "file") }}
    >
      <div className="flex shrink-0 items-center gap-0.5">
        {type === "folder" && (
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
        )}
        {type === "file" && (
          <FileIcon fileName={value} autoAssign className="size-4 shrink-0" />
        )}
        {type === "folder" && (
          <FolderIcon className="size-4 shrink-0" folderName={value} />
        )}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none focus:ring-1 focus:ring-ring focus:ring-inset"
        onBlur={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSubmit();
          }
          if (e.key === "Escape") {
            onCancel();
          }
        }}
      />
    </div>
  );
};
