import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { ProjectIdLayout } from "@/components/project-id-layout";
import { ProjectIdView } from "@/components/project-id-view";
import { orpcClient } from "@/lib/orpc";

const searchSchema = z.object({
  conversationId: z.number().optional(),
});

export const Route = createFileRoute("/projects/$projectId")({
  component: RouteComponent,
  validateSearch: searchSchema,
  async loader(ctx) {
    const currentUser = await ctx.context.queryClient.ensureQueryData(
      orpcClient.profile.getCurrentUser.queryOptions(),
    );

    if (!currentUser || !currentUser.id) {
      throw redirect({ to: "/sign-in" });
    }
  },
});

function RouteComponent() {
  return (
    <ProjectIdLayout>
      <ProjectIdView />
    </ProjectIdLayout>
  );
}
