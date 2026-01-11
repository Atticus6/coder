import { TanStackDevtools } from "@tanstack/react-devtools";

import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Providers } from "@/components/providers";

import { orpcClient } from "@/lib/orpc";
import type { RouterContext } from "@/router";

export const Route = createRootRouteWithContext<RouterContext>()({
  async loader(ctx) {
    await ctx.context.queryClient.ensureQueryData(
      orpcClient.profile.getCurrentUser.queryOptions(),
    );
  },
  component: RootComponent,
  notFoundComponent: () => <div>404</div>,
});

function RootComponent() {
  return (
    <Providers>
      <Outlet />
      <TanStackDevtools
        config={{
          position: "bottom-right",
        }}
        plugins={[
          {
            name: "Tanstack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </Providers>
  );
}
