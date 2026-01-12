import type { Auth } from "!/lib/auth";
import { ORPCError, os } from "@orpc/server";

export const base = os
  .$context<{ request: Request; authState: Auth | null }>()
  .use(async ({ context, next }) => {
    return next({
      context: {
        ...context.authState,
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
