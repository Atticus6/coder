import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { ProjectIdLayout } from "@/components/project-id-layout";
import { ProjectIdView } from "@/components/project-id-view";
import { Spinner } from "@/components/ui/spinner";
import { orpcClient } from "@/lib/orpc";

const searchSchema = z.object({
  conversationId: z.number().optional(),
});

export const Route = createFileRoute("/projects/$projectId")({
  component: RouteComponent,
  validateSearch: searchSchema,
  async loader({ context: { queryClient }, params }) {
    const currentUser = await queryClient.ensureQueryData(
      orpcClient.profile.getCurrentUser.queryOptions(),
    );
    if (!currentUser || !currentUser.id) {
      throw redirect({ to: "/sign-in" });
    }
    const projectId = Number(params.projectId);
    await Promise.all([
      queryClient.ensureQueryData(
        orpcClient.project.getById.queryOptions({
          input: projectId,
        }),
      ),
      queryClient.ensureQueryData(
        orpcClient.file.getFileTree.queryOptions({
          input: { projectId },
        }),
      ),
    ]);
  },

  pendingComponent: () => {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  },
});

function RouteComponent() {
  return (
    <ProjectIdLayout>
      <ProjectIdView />
    </ProjectIdLayout>
  );
}
