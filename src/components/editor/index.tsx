import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { isBinaryFile, isImageFile } from "@/lib/file-utils";
import { client, orpcClient } from "@/lib/orpc";
import CodeEditor from "./CodeEditor";
import { FileBreadcrumbs } from "./FileBreadcrumbs";
import ImagePreview from "./ImagePreview";
import { useEditor } from "./store/use-editor";
import { TopNavigation } from "./TopNavigation";

const DEBOUNCE_MS = 1500;

/**
 * Renders the editor UI for a project, showing the active file as an image preview, a non-previewable message for binary files, or a code editor with debounced autosave.
 *
 * @param projectId - The project identifier used to fetch and save the active file
 * @returns The rendered editor UI for the specified project
 */
function Editor({ projectId }: { projectId: number }) {
  const { activeTabId } = useEditor(projectId);

  const { data: activeFile } = useQuery(
    orpcClient.file.getById.queryOptions({
      input: activeTabId!,
      enabled: !!activeTabId,
    }),
  );

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center">
        <TopNavigation projectId={projectId} />
      </div>
      <FileBreadcrumbs projectId={projectId} />
      <div className="min-h-0 flex-1 bg-background">
        {activeFile ? (
          isImageFile(activeFile.name, activeFile.mimeType) ? (
            <ImagePreview
              key={activeFile.id}
              fileName={activeFile.name}
              content={activeFile.content}
              mimeType={activeFile.mimeType}
              fileUrl={activeFile.fileUrl}
            />
          ) : isBinaryFile(activeFile.name) ? (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              Cannot preview this file type
            </div>
          ) : (
            <CodeEditor
              key={activeFile.id}
              fileName={activeFile.name}
              initialValue={activeFile.content}
              onChange={(content: string) => {
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current);
                }

                const data = {
                  content,
                  id: activeFile.id,
                  projectId,
                };
                timeoutRef.current = setTimeout(() => {
                  client.file.updateContent(data);
                }, DEBOUNCE_MS);
              }}
            />
          )
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <span className="text-sm">
              Select the file from the left to start editing
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default Editor;
