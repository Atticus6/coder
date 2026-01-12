import { type Auth, auth } from "!/lib/auth";
import { storage } from "!/lib/storage";
import { router } from "!/rpc";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { BatchHandlerPlugin } from "@orpc/server/plugins";
import { createUIMessageStreamResponse } from "ai";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { getRun } from "workflow/api";
import { sanitizeFileName, validateFile } from "#/upload-config";

const app = new Hono<{
  Variables: {
    authState: Auth | null;
  };
}>()
  .basePath("/api")
  .use(logger())

  .notFound((c) => c.text("404"));

app.use("*", async (c, next) => {
  const authState = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!authState) {
    c.set("authState", null);
    await next();
    return;
  }
  c.set("authState", authState);
  await next();
});

app.on(["POST", "GET"], "/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

app.post("/upload", async (c) => {
  if (!c.var.authState) {
    return c.text("Unauthorized", 401);
  }
  const formData = await c.req.formData();
  const files = formData.getAll("file") as File[];

  if (!files || files.length === 0) {
    return c.text("No file uploaded", 400);
  }

  const results: { fileName: string; url: string }[] = [];

  for (const file of files) {
    if (file instanceof File) {
      // 校验文件大小和类型
      const validation = validateFile(file);
      if (!validation.valid) {
        return c.text(validation.error || "upload error", 400);
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const safeName = sanitizeFileName(file.name);
      const url = await storage.upload(buffer, safeName);
      results.push({ fileName: file.name, url });
    }
  }
  if (results.length === 0) {
    return c.text("No valid files found", 400);
  }
  return c.json(results);
});

app.get("/chat/:runId", async (c) => {
  const runId = c.req.param("runId");

  const startIndexParam = c.req.query("startIndex");
  // Client provides the last chunk index they received

  const startIndex = startIndexParam
    ? Number.parseInt(startIndexParam, 10)
    : undefined;

  const run = getRun(runId);

  if (!run) {
    return new Response("Run not found or already completed", { status: 404 });
  }

  const stream = run.getReadable({ startIndex });

  return createUIMessageStreamResponse({ stream });
});

const rpcHandler = new RPCHandler(router, {
  plugins: [new BatchHandlerPlugin()],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

app.use("/rpc/*", async (c, next) => {
  const { matched, response } = await rpcHandler.handle(c.req.raw, {
    prefix: "/api/rpc",
    context: {
      authState: c.var.authState,
      request: c.req.raw,
    },
  });
  if (matched) {
    return c.newResponse(response.body, response);
  }
  await next();
});

export default app;
