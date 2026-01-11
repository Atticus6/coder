import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { SparkleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { FaGithub } from "react-icons/fa";
import { ProjectList } from "@/components/ProjectList";
import { ProjectsCommandDialog } from "@/components/ProjectsCommandDialog";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { client, orpcClient } from "@/lib/orpc";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  const queryClient = useQueryClient();

  const [commandDialogOpen, setCommandDialogOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "k") {
          e.preventDefault();
          setCommandDialogOpen(true);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <ProjectsCommandDialog
        open={commandDialogOpen}
        onOpenChange={setCommandDialogOpen}
      />
      <div className="flex min-h-screen flex-col items-center justify-center bg-sidebar p-6 md:p-16">
        <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4">
          <div className="flex w-full items-center justify-between gap-4">
            <div className="group/logo flex w-full items-center gap-2">
              <img
                src="/vercel.svg"
                alt="Vercel"
                className="size-8 md:size-11.5"
              />
              <h1
                className={cn(
                  "font-semibold text-4xl md:text-5xl",
                  // font.className,
                )}
              >
                Coder
              </h1>
            </div>
          </div>

          <div className="flex w-full flex-col gap-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  const res = await client.project.create();
                  if (res) {
                    queryClient.refetchQueries({
                      queryKey: orpcClient.project.getProjects.queryKey(),
                    });
                  }
                  // const projectName = uniqueNamesGenerator({
                  //   dictionaries: [adjectives, animals, colors],
                  //   separator: "-",
                  //   length: 3,
                  // });
                  // createProject({
                  //   name: projectName,
                  // });
                }}
                className="flex h-full flex-col items-start justify-start gap-6 rounded-none border bg-background p-4"
              >
                <div className="flex w-full items-center justify-between">
                  <SparkleIcon className="size-4" />
                  <Kbd className="text-lg">⌘J</Kbd>
                </div>
                <div>
                  <span className="text-sm">New</span>
                </div>
              </Button>
              <Button
                variant="outline"
                onClick={() => {}}
                className="flex h-full flex-col items-start justify-start gap-6 rounded-none border bg-background p-4"
              >
                <div className="flex w-full items-center justify-between">
                  <FaGithub className="size-4" />
                  <Kbd className="text-lg">⌘I</Kbd>
                </div>
                <div>
                  <span className="text-sm">Import</span>
                </div>
              </Button>
            </div>

            <ProjectList onViewAll={() => setCommandDialogOpen(true)} />
          </div>
        </div>
      </div>
    </>
  );
}
