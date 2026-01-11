import { aiRouter } from "./ai";
import { conversationRouter } from "./conversation";
import { fileRouter } from "./file";
import { profileRouter } from "./profile";
import { projectRouter } from "./project";
export const router = {
  project: projectRouter,
  file: fileRouter,
  ai: aiRouter,
  conversation: conversationRouter,
  profile: profileRouter,
};

export type App = typeof router;
