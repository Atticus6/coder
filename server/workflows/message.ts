import { modelId, openai } from "!/lib/ai";
import { db, schema } from "!/lib/db";
import type { UIMessageChunk } from "ai";
import { streamText } from "ai";
import { eq } from "drizzle-orm";
import { FatalError, getWritable } from "workflow";

type StartMessageInput = {
  conversationId: number;
  aiMessageId: number;
};

export async function startMessage({
  conversationId,
  aiMessageId,
}: StartMessageInput) {
  "use workflow";

  // 获取 writable stream 用于流式输出
  const writable = getWritable<UIMessageChunk>();

  // 调用AI生成响应，传入 writable
  await generateAIResponse(conversationId, aiMessageId, writable);
}

async function generateAIResponse(
  conversationId: number,
  assistantMessageId: number,
  writable: WritableStream<UIMessageChunk>,
) {
  "use step";
  console.log("generateAIResponse");

  const conversation = await db.query.conversation.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, conversationId);
    },
    with: {
      messages: {
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
      },
    },
  });

  if (!conversation) {
    throw new FatalError("Conversation does not exist");
  }

  // 过滤掉当前正在处理的assistant消息
  const historyMessages = conversation.messages
    .filter((msg) => msg.id !== assistantMessageId)
    .map((item) => ({
      content: item.content,
      role: item.role,
    }));

  const writer = writable.getWriter();

  try {
    const result = streamText({
      model: openai.chat(modelId),
      messages: historyMessages,
    });

    let fullText = "";

    // 流式写入到 workflow writable
    for await (const chunk of result.textStream) {
      fullText += chunk;
      await writer.write({
        type: "text-delta",
        delta: chunk,
        id: assistantMessageId.toString(),
      });
    }

    // 关闭流
    await writer.close();

    // 更新消息内容和状态
    await db
      .update(schema.message)
      .set({
        content: fullText,
        status: "completed",
      })
      .where(eq(schema.message.id, assistantMessageId));
    return { success: true, content: fullText };
  } catch (error) {
    // 出错时也要关闭流
    await writer.close();

    // 标记消息为取消状态
    await db
      .update(schema.message)
      .set({
        content: "抱歉，生成响应时出现错误。",
        status: "cancelled",
      })
      .where(eq(schema.message.id, assistantMessageId));

    throw new FatalError(
      `AI generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
