"use client";
import type { PropsWithChildren } from "react";
import { ActivityBar } from "./ActivityBar";

export function ProjectIdLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex h-screen w-full flex-row">
      <ActivityBar />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
