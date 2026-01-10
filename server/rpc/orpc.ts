import { auth } from "!/lib/auth";
import { ORPCError, os } from "@orpc/server";

export const base = os
  .$context<{ request: Request }>()
  .use(async ({ context, next }) => {
    const session = await auth.api.getSession({
      headers: context.request.headers,
    });
    return next({
      context: {
        ...session,
      },
    });
  });

export const requireAuth = base.use(async ({ context, next }) => {
  if (!context.user) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return next({
    context: {
      ...context,
      user: context.user!,
    },
  });
});
