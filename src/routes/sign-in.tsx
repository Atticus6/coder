import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/sign-in")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Button
        onClick={() => {
          authClient.signIn.social({ provider: "github" });
        }}
      >
        github
      </Button>
    </div>
  );
}
