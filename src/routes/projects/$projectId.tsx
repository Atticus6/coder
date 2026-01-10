import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ProjectIdLayout } from "@/components/project-id-layout";
import { ProjectIdView } from "@/components/project-id-view";

const searchSchema = z.object({
  conversationId: z.number().optional(),
});

export const Route = createFileRoute("/projects/$projectId")({
  component: RouteComponent,
  validateSearch: searchSchema,
});

function RouteComponent() {
  return (
    <ProjectIdLayout>
      <ProjectIdView />
    </ProjectIdLayout>
  );
}
