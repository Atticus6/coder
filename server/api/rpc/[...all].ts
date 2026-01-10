import { router } from "!/rpc";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { BatchHandlerPlugin } from "@orpc/server/plugins";
import { defineEventHandler } from "nitro/h3";

const handler = new RPCHandler(router, {
  plugins: [new BatchHandlerPlugin()],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

async function handleRequest(request: Request) {
  const url = new URL(request.url);

  // 跳过 TanStack Devtools 请求，避免 oRPC 抛出错误导致 Vite 崩溃
  if (url.pathname.startsWith("/__tsd/")) {
    return new Response("Not found", { status: 404 });
  }

  const { response } = await handler.handle(request, {
    prefix: "/api/rpc",
    context: { request },
  });

  return response ?? new Response("Not found", { status: 404 });
}

export default defineEventHandler(({ req }) => {
  return handleRequest(req);
});
