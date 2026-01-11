import { createFileRoute } from "@tanstack/react-router";
import { FaGithub } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/sign-in")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sidebar p-6 md:p-16">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4">
        <div className="flex w-full items-center justify-between gap-4">
          <div className="group/logo flex w-full items-center gap-2">
            <img
              src="/vercel.svg"
              alt="Vercel"
              className="size-8 md:size-11.5"
            />
            <h1 className="font-semibold text-4xl md:text-5xl">Coder</h1>
          </div>
        </div>

        <div className="flex w-full flex-col gap-4">
          <Button
            variant="outline"
            onClick={() => {
              authClient.signIn.social({ provider: "github" });
            }}
            className="flex h-full flex-col items-start justify-start gap-6 rounded-none border bg-background p-4"
          >
            <div className="flex w-full items-center justify-between">
              <FaGithub className="size-4" />
            </div>
            <div>
              <span className="text-sm">Sign in with GitHub</span>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}
