import { db } from "!/lib/db";
import { conversation } from "!/lib/schema/others";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "./orpc";

const getById = requireAuth
  .input(z.number())
  .handler(async ({ input, context }) => {
    const conv = await db.query.conversation.findFirst({
      where(fields, operators) {
        return operators.eq(fields.id, input);
      },
      with: {
        project: {
          columns: {
            ownerId: true,
          },
        },
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

    if (conv.project.ownerId !== context.user.id) {
      throw new ORPCError("FORBIDDEN");
    }

    return conv;
  });

const deleteById = requireAuth
  .input(z.number())
  .handler(async ({ input, context }) => {
    // 先查询 conversation 及其关联的 project，验证所有权
    const conv = await db.query.conversation.findFirst({
      where(fields, operators) {
        return operators.eq(fields.id, input);
      },
      with: {
        project: true,
      },
    });

    if (!conv) {
      throw new ORPCError("NOT_FOUND");
    }

    if (conv.project.ownerId !== context.user.id) {
      throw new ORPCError("FORBIDDEN");
    }

    await db.delete(conversation).where(eq(conversation.id, input));

    return { success: true };
  });

export const conversationRouter = {
  getById,
  deleteById,
};
