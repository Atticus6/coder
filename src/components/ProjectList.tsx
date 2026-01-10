"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { AlertCircleIcon, GlobeIcon, Loader2Icon } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { type OrpcOutputs, orpcClient } from "@/lib/orpc";
import { Kbd } from "./ui/kbd";

type Project = OrpcOutputs["project"]["getProjects"][number];

const formatTimestamp = (d: Date) => {
  return formatDistanceToNow(d, {
    addSuffix: true,
  });
};

const getProjectIcon = (project: Project) => {
  if (project.importStatus === "completed") {
    return <FaGithub className="size-3.5 text-muted-foreground" />;
  }

  if (project.importStatus === "failed") {
    return <AlertCircleIcon className="size-3.5 text-muted-foreground" />;
  }

  if (project.importStatus === "importing") {
    return (
      <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
    );
  }

  return <GlobeIcon className="size-3.5 text-muted-foreground" />;
};

export function ProjectList() {
  const { data } = useQuery(orpcClient.project.getProjects.queryOptions());

  if (data) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs">Recent projects</span>
          <button
            //   onClick={onViewAll}
            className="flex items-center gap-2 text-muted-foreground text-xs transition-colors hover:text-foreground"
          >
            <span>View all</span>
            <Kbd className="text-md">⌘K</Kbd>
          </button>
        </div>
        <ul className="flex flex-col">
          {data.map((project) => (
            <ProjectItem key={project.id} data={project} />
          ))}
        </ul>
      </div>
    );
  }
}

const ProjectItem = ({ data }: { data: Project }) => {
  return (
    <Link
      to="/projects/$projectId"
      params={{
        projectId: String(data.id),
      }}
      className="group flex w-full items-center justify-between py-1 font-medium text-foreground/60 text-sm hover:text-foreground"
    >
      <div className="flex items-center gap-2">
        {getProjectIcon(data)}
        <span className="truncate">{data.name}</span>
      </div>
      <span className="text-muted-foreground text-xs transition-colors group-hover:text-foreground/60">
        {formatTimestamp(data.updatedAt)}
      </span>
    </Link>
  );
};
