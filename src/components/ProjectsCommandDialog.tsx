import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircleIcon, GlobeIcon, Loader2Icon } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { type OrpcOutputs, orpcClient } from "@/lib/orpc";

interface ProjectsCommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Project = OrpcOutputs["project"]["getProjects"][number];

const getProjectIcon = (project: Project) => {
  if (project.importStatus === "completed") {
    return <FaGithub className="size-4 text-muted-foreground" />;
  }

  if (project.importStatus === "failed") {
    return <AlertCircleIcon className="size-4 text-muted-foreground" />;
  }

  if (project.importStatus === "importing") {
    return (
      <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
    );
  }

  return <GlobeIcon className="size-4 text-muted-foreground" />;
};

export const ProjectsCommandDialog = ({
  open,
  onOpenChange,
}: ProjectsCommandDialogProps) => {
  const nav = useNavigate();

  const {
    data: projects,
    isLoading,
    isError,
  } = useQuery(orpcClient.project.getProjects.queryOptions());

  const handleSelect = (projectId: number) => {
    nav({
      to: "/projects/$projectId",
      params: {
        projectId: String(projectId),
      },
    });

    onOpenChange(false);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search Projects"
      description="Search and navigate to your projects"
    >
      <CommandInput placeholder="Search projects..." />
      <CommandList>
        {isLoading ? (
          <div className="py-6 text-center text-muted-foreground text-sm">
            Loading projects...
          </div>
        ) : isError ? (
          <div className="py-6 text-center text-destructive text-sm">
            Failed to load projects. Please try again.
          </div>
        ) : (
          <CommandEmpty>No projects found.</CommandEmpty>
        )}
        <CommandGroup heading="Projects">
          {projects?.map((project) => (
            <CommandItem
              key={project.id}
              value={`${project.name}-${project.id}`}
              onSelect={() => handleSelect(project.id)}
            >
              {getProjectIcon(project)}
              <span>{project.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
