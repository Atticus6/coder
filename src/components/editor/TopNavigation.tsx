import { FileIcon } from "@react-symbols/icons/utils";
import { useQuery } from "@tanstack/react-query";
import { XIcon } from "lucide-react";
import { orpcClient } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { Spinner } from "../ui/spinner";
import { useEditor } from "./store/use-editor";

const Tab = ({
  fileId,
  isFirst,
  projectId,
}: {
  fileId: number;
  isFirst: boolean;
  projectId: number;
}) => {
  const { data: fileName } = useQuery(
    orpcClient.file.getNameById.queryOptions({ input: fileId }),
  );

  const { activeTabId, previewTabId, setActiveTab, openFile, closeTab } =
    useEditor(projectId);

  const isActive = activeTabId === fileId;
  const isPreview = previewTabId === fileId;

  return (
    <div
      onClick={() => setActiveTab(fileId)}
      onDoubleClick={() => openFile(fileId, { pinned: true })}
      className={cn(
        "group flex h-8.75 cursor-pointer items-center gap-2 border-transparent border-x border-y pr-1.5 pl-2 text-muted-foreground hover:bg-accent/30",
        isActive &&
          "-mb-px border-x-border border-b-background bg-background text-foreground drop-shadow",
        isFirst && "border-l-transparent!",
      )}
    >
      {fileName === undefined ? (
        <Spinner className="text-ring" />
      ) : (
        <FileIcon fileName={fileName} autoAssign className="size-4" />
      )}
      <span className={cn("whitespace-nowrap text-sm", isPreview && "italic")}>
        {fileName}
      </span>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          closeTab(fileId);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            closeTab(fileId);
          }
        }}
        className={cn(
          "rounded-sm p-0.5 opacity-0 hover:bg-white/10 group-hover:opacity-100",
          isActive && "opacity-100",
        )}
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );
};

export const TopNavigation = ({ projectId }: { projectId: number }) => {
  const { openTabs } = useEditor(projectId);

  return (
    <ScrollArea className="flex-1">
      <nav className="flex h-8.75 items-center border-b bg-sidebar">
        {openTabs.map((fileId, index) => (
          <Tab
            key={fileId}
            fileId={fileId}
            isFirst={index === 0}
            projectId={projectId}
          />
        ))}
      </nav>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};
