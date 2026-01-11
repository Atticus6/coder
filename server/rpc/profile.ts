import { base } from "./orpc";

const getCurrentUser = base.handler(async ({ context }) => {
  return context.user! || {};
});

export const profileRouter = { getCurrentUser };
