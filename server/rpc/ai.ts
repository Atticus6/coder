import { editRequestSchema, suggestionRequestSchema } from "!/dto/suggestion";
import { modelId, openai } from "!/lib/ai";
import { db, schema } from "!/lib/db";
import { QUICK_EDIT_PROMPT, SUGGESTION_PROMPT } from "!/lib/prompts";
import { truncateString } from "!/lib/utils";
import { startMessage } from "!/workflows/message";
import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { start } from "workflow/api";
import { z } from "zod";
import { requireAuth } from "./orpc";

const getSuggestion = requireAuth
  .input(suggestionRequestSchema)
  .handler(async () => {
    SUGGESTION_PROMPT;
    // console.log(input);

    return "test";
    // const {
    //   fileName,
    //   code,
    //   currentLine,
    //   previousLines,
    //   textBeforeCursor,
    //   textAfterCursor,
    //   nextLines,
    //   lineNumber,
    // } = input;

    // const prompt = SUGGESTION_PROMPT.replace("{fileName}", fileName)
    //   .replace("{code}", code)
    //   .replace("{currentLine}", currentLine)
    //   .replace("{previousLines}", previousLines || "")
    //   .replace("{textBeforeCursor}", textBeforeCursor)
    //   .replace("{textAfterCursor}", textAfterCursor)
    //   .replace("{nextLines}", nextLines || "")
    //   .replace("{lineNumber}", lineNumber.toString());

    // const { output } = await generateText({
    //   model: openai.chat(modelId),
    //   prompt,
    // });

    // return output;
  });

const sendMessage = requireAuth
  .input(
    z.object({
      conversationId: z.number().optional(),
      message: z.string().min(1),
      projectId: z.number(),
    }),
  )
  .handler(async ({ input }) => {
    let conversationId = input.conversationId ?? 0;

    // 如果没有conversationId，创建新对话
    if (!conversationId) {
      const title = truncateString(input.message, 20);
      const [newConversation] = await db
        .insert(schema.conversation)
        .values({ projectId: input.projectId, title })
        .returning();
      conversationId = newConversation.id;
    }

    // 插入用户消息
    await db.insert(schema.message).values({
      conversationId,
      status: "completed",
      role: "user",
      content: input.message,
    });

    const [newMessage] = await db
      .insert(schema.message)
      .values({
        conversationId,
        role: "assistant",
        content: "",
        status: "processing",
      })
      .returning();

    // 触发workflow处理AI响应
    const { runId } = await start(startMessage, [
      { conversationId, aiMessageId: newMessage.id },
    ]);

    return { conversationId, runId };
  });

const getConversationList = requireAuth
  .input(z.object({ projectId: z.number() }))
  .handler(async ({ input }) => {
    const conversations = await db.query.conversation.findMany({
      where: eq(schema.conversation.projectId, input.projectId),
      orderBy: (conversation, { desc }) => [desc(conversation.updatedAt)],
    });
    return conversations;
  });

const quickEdit = requireAuth
  .input(editRequestSchema)
  .handler(async ({ input }) => {
    const { selectedCode, fullCode, instruction } = input;
    const prompt = QUICK_EDIT_PROMPT.replace("{selectedCode}", selectedCode)
      .replace("{fullCode}", fullCode || "")
      .replace("{instruction}", instruction)
      .replace("{documentation}", "");
    const { output } = await generateText({
      model: openai.chat(modelId),
      prompt,
    });
    return output;
  });

export const aiRouter = {
  getSuggestion,
  sendMessage,
  getConversationList,
  quickEdit,
};
