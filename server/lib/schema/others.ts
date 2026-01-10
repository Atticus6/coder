import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const project = pgTable("project", {
  id: serial().primaryKey(),
  name: text().notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  importStatus: text()
    .$type<"completed" | "failed" | "importing">()
    .default("completed")
    .notNull(),
  // 编辑器状态
  activeTabId: integer("active_tab_id"),
  previewTabId: integer("preview_tab_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const file = pgTable("file", {
  id: serial().primaryKey(),
  name: text().notNull(),
  projectId: integer("project_id").references(() => project.id, {
    onDelete: "cascade",
  }),
  parentId: integer("parent_id").references((): any => file.id, {
    onDelete: "cascade",
  }),

  type: text().$type<"file" | "folder">().default("file").notNull(),
  content: text().default("").notNull(),
  // 文件夹: 是否展开 / 文件: 是否在编辑器中打开
  isOpen: boolean("is_open").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const conversation = pgTable("conversation", {
  id: serial().primaryKey(),
  title: text().notNull(),
  projectId: integer("project_id")
    .references(() => project.id, {
      onDelete: "cascade",
    })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const message = pgTable("message", {
  id: serial().primaryKey(),
  conversationId: integer("conversation_id")
    .references(() => conversation.id, {
      onDelete: "cascade",
    })
    .notNull(),
  role: text()
    .$type<"user" | "assistant" | "system">()
    .default("assistant")
    .notNull(),
  content: text().default("").notNull(),
  status: text().$type<"processing" | "completed" | "cancelled">().notNull(),
  runId: text("run_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const conversationRealtions = relations(conversation, ({ one, many }) => {
  return {
    project: one(project, {
      fields: [conversation.projectId],
      references: [project.id],
    }),
    messages: many(message),
  };
});

export const messageRelations = relations(message, ({ one }) => {
  return {
    conversation: one(conversation, {
      fields: [message.conversationId],
      references: [conversation.id],
    }),
  };
});
