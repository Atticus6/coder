import type { App } from "!/rpc";
import { createORPCClient, type InferClientOutputs } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { BatchLinkPlugin } from "@orpc/client/plugins";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

declare global {
  var $client: RouterClient<App> | undefined;
}

const link = new RPCLink({
  url: () => {
    if (typeof window === "undefined") {
      throw new Error("RPCLink is not allowed on the server side.");
    }

    return `${window.location.origin}/api/rpc`;
  },
  plugins: [
    new BatchLinkPlugin({
      mode: typeof window === "undefined" ? "buffered" : "streaming",
      groups: [
        {
          condition: () => true,
          context: {},
        },
      ],
    }),
  ],
});

/**
 * Fallback to client-side client if server-side client is not available.
 */
export const client: RouterClient<App> =
  globalThis.$client ?? createORPCClient(link);

export type OrpcOutputs = InferClientOutputs<typeof client>;

export const orpcClient = createTanstackQueryUtils(client);
