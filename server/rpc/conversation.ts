import { db } from "!/lib/db";
import { conversation } from "!/lib/schema/others";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "./orpc";

const getById = requireAuth.input(z.number()).handler(async ({ input }) => {
  const conv = await db.query.conversation.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, input);
    },
    with: {
      messages: {
        orderBy(fields, operators) {
          return operators.asc(fields.createdAt);
        },
      },
    },
  });

  if (!conv) {
    throw new ORPCError("NOT_FOUND");
  }

  return conv;
});

const deleteById = requireAuth.input(z.number()).handler(async ({ input }) => {
  const result = await db
    .delete(conversation)
    .where(eq(conversation.id, input))
    .returning({ id: conversation.id });

  if (!result.length) {
    throw new ORPCError("NOT_FOUND");
  }

  return { success: true };
});

export const conversationRouter = {
  getById,
  deleteById,
};
