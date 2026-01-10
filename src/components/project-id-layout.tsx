"use client";
import { Allotment } from "allotment";
import { type PropsWithChildren, useCallback, useState } from "react";
import { ActivityBar } from "./ActivityBar";

import { ConversationSidebar } from "./conversationSidebar";

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 800;
const DEFAULT_CONVERSATION_SIDEBAR_WIDTH = 400;
const DEFAULT_MAIN_SIZE = 1000;
const STORAGE_KEY = "project-layout-sizes";

function getSavedSizes(): number[] | undefined {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {}
  return undefined;
}

function saveSizes(sizes: number[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes));
  } catch {}
}

export function ProjectIdLayout({ children }: PropsWithChildren) {
  const [defaultSizes] = useState(
    () =>
      getSavedSizes() ?? [
        DEFAULT_CONVERSATION_SIDEBAR_WIDTH,
        DEFAULT_MAIN_SIZE,
      ],
  );

  const handleChange = useCallback((sizes: number[]) => {
    saveSizes(sizes);
  }, []);

  return (
    <div className="flex h-screen w-full flex-row">
      <ActivityBar />

      <div className="flex flex-1 flex-row overflow-hidden">
        <Allotment
          className="flex flex-1"
          defaultSizes={defaultSizes}
          onChange={handleChange}
        >
          <Allotment.Pane>{children}</Allotment.Pane>
          <Allotment.Pane
            className="flex-1"
            snap
            minSize={MIN_SIDEBAR_WIDTH}
            maxSize={MAX_SIDEBAR_WIDTH}
          >
            <ConversationSidebar />
          </Allotment.Pane>
        </Allotment>
      </div>
    </div>
  );
}
