import { env } from "!/env";
import { createOpenAI } from "@ai-sdk/openai";

export const openai = createOpenAI({
  apiKey: env.AI_TOKEN,
  baseURL: "https://api.moonshot.cn/v1/",
});

export const modelId = "kimi-k2-0905-preview";
