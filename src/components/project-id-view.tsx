"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { Allotment } from "allotment";
import { useEffect, useState } from "react";
import { FaGithub } from "react-icons/fa";
import { orpcClient } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import Editor from "./editor";
import { useEditorStore } from "./editor/store/use-editor-store";
import FileExplorer from "./fileExplorer";

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 800;
const DEFAULT_SIDEBAR_WIDTH = 350;
const DEFAULT_MAIN_SIZE = 1000;

const Tab = ({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex h-full cursor-pointer items-center gap-2 border-r px-3 text-muted-foreground hover:bg-accent/30",
        isActive && "bg-background text-foreground",
      )}
    >
      <span className="text-sm">{label}</span>
    </div>
  );
};

export const ProjectIdView = () => {
  const [activeView, setActiveView] = useState<"editor" | "preview">("editor");

  const projectId = useParams({
    strict: false,
    select(params) {
      return Number(params.projectId);
    },
  });

  // 获取项目数据（包含 activeTabId, previewTabId）
  const { data: project } = useQuery(
    orpcClient.project.getById.queryOptions({ input: projectId }),
  );

  // 获取文件树（包含 isOpen 状态）
  const { data: fileTree } = useQuery(
    orpcClient.file.getFileTree.queryOptions({ input: { projectId } }),
  );

  const store = useEditorStore();
  const initialized = useEditorStore((state) =>
    state.initialized.has(projectId),
  );

  // 从服务器数据初始化编辑器状态
  useEffect(() => {
    if (project && fileTree && !initialized) {
      // 收集所有 isOpen=true 的文件 ID
      const collectOpenFiles = (nodes: typeof fileTree): number[] => {
        const ids: number[] = [];
        for (const node of nodes) {
          if (node.type === "file" && node.isOpen) {
            ids.push(node.id);
          }
          if (node.children) {
            ids.push(...collectOpenFiles(node.children));
          }
        }
        return ids;
      };

      const openTabs = collectOpenFiles(fileTree);
      store.initFromServer(
        projectId,
        openTabs,
        project.activeTabId,
        project.previewTabId,
      );
    }
  }, [projectId, project, fileTree, initialized, store]);

  return (
    <div className="flex h-full flex-col">
      <nav className="flex h-8.75 shrink-0 items-center border-b bg-sidebar">
        <Tab
          label="Code"
          isActive={activeView === "editor"}
          onClick={() => setActiveView("editor")}
        />
        <Tab
          label="Preview"
          isActive={activeView === "preview"}
          onClick={() => setActiveView("preview")}
        />
        <div className="flex h-full flex-1 justify-end">
          <div className="flex h-full cursor-pointer items-center gap-1.5 border-l px-3 text-muted-foreground hover:bg-accent/30">
            <FaGithub className="size-3.5" />
            <span className="text-sm">Export</span>
          </div>
        </div>
      </nav>
      <div className="relative flex-1">
        <div
          className={cn(
            "absolute inset-0",
            activeView === "editor" ? "visible" : "invisible",
          )}
        >
          <Allotment defaultSizes={[DEFAULT_SIDEBAR_WIDTH, DEFAULT_MAIN_SIZE]}>
            <Allotment.Pane
              snap
              minSize={MIN_SIDEBAR_WIDTH}
              maxSize={MAX_SIDEBAR_WIDTH}
              preferredSize={DEFAULT_SIDEBAR_WIDTH}
            >
              <FileExplorer projectId={projectId} />
            </Allotment.Pane>
            <Allotment.Pane>
              <Editor projectId={projectId} />
            </Allotment.Pane>
          </Allotment>
        </div>

        <div
          className={cn(
            "absolute inset-0",
            activeView === "preview" ? "visible" : "invisible",
          )}
        >
          <div>Preview</div>
        </div>
      </div>
    </div>
  );
};
