import { auth } from "!/lib/auth";
import { defineEventHandler } from "nitro/h3";

export default defineEventHandler(({ req }) => {
  return auth.handler(req);
});
