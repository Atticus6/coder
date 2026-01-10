import { create } from "zustand";
import { client } from "@/lib/orpc";

interface TabState {
  openTabs: number[];
  activeTabId: number | null;
  previewTabId: number | null;
}

const defaultTabState: TabState = {
  openTabs: [],
  activeTabId: null,
  previewTabId: null,
};

interface EditorStore {
  tabs: Map<number, TabState>;
  initialized: Set<number>;
  getTabState: (projectId: number) => TabState;
  initFromServer: (
    projectId: number,
    openTabs: number[],
    activeTabId: number | null,
    previewTabId: number | null,
  ) => void;
  openFile: (
    projectId: number,
    fileId: number,
    options: { pinned: boolean },
  ) => void;
  closeTab: (projectId: number, fileId: number) => void;
  closeAllTabs: (projectId: number) => void;
  setActiveTab: (projectId: number, fileId: number) => void;
}

// 异步保存到数据库（不阻塞 UI）
const saveToServer = (
  projectId: number,
  activeTabId: number | null,
  previewTabId: number | null,
) => {
  client.project.updateEditorState({
    id: projectId,
    activeTabId,
    previewTabId,
  });
};

const saveFileOpen = (fileId: number, isOpen: boolean) => {
  client.file.updateOpen({ id: fileId, isOpen });
};

export const useEditorStore = create<EditorStore>()((set, get) => ({
  tabs: new Map(),
  initialized: new Set(),

  getTabState: (projectId) => {
    return get().tabs.get(projectId) ?? defaultTabState;
  },

  // 从服务器数据初始化
  initFromServer: (projectId, openTabs, activeTabId, previewTabId) => {
    if (get().initialized.has(projectId)) return;

    const tabs = new Map(get().tabs);
    const initialized = new Set(get().initialized);

    tabs.set(projectId, { openTabs, activeTabId, previewTabId });
    initialized.add(projectId);

    set({ tabs, initialized });
  },

  openFile: (projectId, fileId, { pinned }) => {
    const tabs = new Map(get().tabs);
    const state = tabs.get(projectId) ?? defaultTabState;
    const { openTabs, previewTabId } = state;
    const isOpen = openTabs.includes(fileId);

    // Case 1: Opening as preview - replace existing preview or add new
    if (!isOpen && !pinned) {
      const newTabs = previewTabId
        ? openTabs.map((id) => (id === previewTabId ? fileId : id))
        : [...openTabs, fileId];

      const newState = {
        openTabs: newTabs,
        activeTabId: fileId,
        previewTabId: fileId,
      };
      tabs.set(projectId, newState);
      set({ tabs });

      // 保存到数据库
      saveFileOpen(fileId, true);
      if (previewTabId && previewTabId !== fileId) {
        saveFileOpen(previewTabId, false);
      }
      saveToServer(projectId, fileId, fileId);
      return;
    }

    // Case 2: Opening as pinned - add new tab
    if (!isOpen && pinned) {
      const newState = {
        ...state,
        openTabs: [...openTabs, fileId],
        activeTabId: fileId,
      };
      tabs.set(projectId, newState);
      set({ tabs });

      // 保存到数据库
      saveFileOpen(fileId, true);
      saveToServer(projectId, fileId, state.previewTabId);
      return;
    }

    // Case 3: File already open - just activate (and pin if double-clicked)
    const shouldPin = pinned && previewTabId === fileId;
    const newPreviewTabId = shouldPin ? null : previewTabId;
    tabs.set(projectId, {
      ...state,
      activeTabId: fileId,
      previewTabId: newPreviewTabId,
    });
    set({ tabs });

    // 保存到数据库
    saveToServer(projectId, fileId, newPreviewTabId);
  },

  closeTab: (projectId, fileId) => {
    const tabs = new Map(get().tabs);
    const state = tabs.get(projectId) ?? defaultTabState;
    const { openTabs, activeTabId, previewTabId } = state;
    const tabIndex = openTabs.indexOf(fileId);

    if (tabIndex === -1) return;

    const newTabs = openTabs.filter((id) => id !== fileId);

    let newActiveTabId = activeTabId;
    if (activeTabId === fileId) {
      if (newTabs.length === 0) {
        newActiveTabId = null;
      } else if (tabIndex >= newTabs.length) {
        newActiveTabId = newTabs[newTabs.length - 1];
      } else {
        newActiveTabId = newTabs[tabIndex];
      }
    }

    const newPreviewTabId = previewTabId === fileId ? null : previewTabId;

    tabs.set(projectId, {
      openTabs: newTabs,
      activeTabId: newActiveTabId,
      previewTabId: newPreviewTabId,
    });
    set({ tabs });

    // 保存到数据库
    saveFileOpen(fileId, false);
    saveToServer(projectId, newActiveTabId, newPreviewTabId);
  },

  closeAllTabs: (projectId) => {
    const tabs = new Map(get().tabs);
    const state = tabs.get(projectId) ?? defaultTabState;

    // 关闭所有文件
    for (const fileId of state.openTabs) {
      saveFileOpen(fileId, false);
    }

    tabs.set(projectId, defaultTabState);
    set({ tabs });

    // 保存到数据库
    saveToServer(projectId, null, null);
  },

  setActiveTab: (projectId, fileId) => {
    const tabs = new Map(get().tabs);
    const state = tabs.get(projectId) ?? defaultTabState;
    tabs.set(projectId, { ...state, activeTabId: fileId });
    set({ tabs });

    // 保存到数据库
    saveToServer(projectId, fileId, state.previewTabId);
  },
}));
