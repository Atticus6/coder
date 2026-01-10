import { createUIMessageStreamResponse } from "ai";
import { defineEventHandler, getRouterParam } from "nitro/h3";
import { getRun } from "workflow/api";

export default defineEventHandler(async (event) => {
  const runId = getRouterParam(event, "runId");

  if (!runId) {
    return new Response("Missing chat id", { status: 400 });
  }

  const { searchParams } = new URL(event.req.url);
  // Client provides the last chunk index they received
  const startIndexParam = searchParams.get("startIndex");
  const startIndex = startIndexParam
    ? parseInt(startIndexParam, 10)
    : undefined;

  const run = getRun(runId);
  const stream = run.getReadable({ startIndex });
  return createUIMessageStreamResponse({ stream });
});
