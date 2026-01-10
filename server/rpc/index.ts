import { aiRouter } from "./ai";
import { conversationRouter } from "./conversation";
import { fileRouter } from "./file";
import { projectRouter } from "./project";

export const router = {
  project: projectRouter,
  file: fileRouter,
  ai: aiRouter,
  conversation: conversationRouter,
};

export type App = typeof router;
