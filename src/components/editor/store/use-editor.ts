import { useCallback } from "react";
import { useEditorStore } from "./use-editor-store";

export const useEditor = (projectId: number) => {
  const store = useEditorStore();
  const tabState = useEditorStore((state) => state.getTabState(projectId));

  const openFile = useCallback(
    (fileId: number, options: { pinned: boolean }) => {
      store.openFile(projectId, fileId, options);
    },
    [store, projectId],
  );

  const closeTab = useCallback(
    (fileId: number) => {
      store.closeTab(projectId, fileId);
    },
    [store, projectId],
  );

  const closeAllTabs = useCallback(() => {
    store.closeAllTabs(projectId);
  }, [store, projectId]);

  const closeOtherTabs = useCallback(
    (fileId: number) => {
      store.closeOtherTabs(projectId, fileId);
    },
    [store, projectId],
  );

  const closeTabsToTheRight = useCallback(
    (fileId: number) => {
      store.closeTabsToTheRight(projectId, fileId);
    },
    [store, projectId],
  );

  const setActiveTab = useCallback(
    (fileId: number) => {
      store.setActiveTab(projectId, fileId);
    },
    [store, projectId],
  );

  return {
    openTabs: tabState.openTabs,
    activeTabId: tabState.activeTabId,
    previewTabId: tabState.previewTabId,
    openFile,
    closeTab,
    closeAllTabs,
    closeOtherTabs,
    closeTabsToTheRight,
    setActiveTab,
  };
};
