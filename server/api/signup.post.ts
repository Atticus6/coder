import { handleUserSignup } from "!/workflows/user-signup";
import { defineEventHandler, toRequest } from "nitro/h3";
import { start } from "workflow/api";

export default defineEventHandler(async (event) => {
  const request = toRequest(event);
  const { email } = (await request.json()) as { email: string };
  // Executes asynchronously and doesn't block your app
  await start(handleUserSignup, [email]);
  return {
    message: "User signup workflow started",
  };
});
