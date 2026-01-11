import { db, schema } from "!/lib/db";
import {
  canAccessRepo,
  createOctokit,
  getGitHubAccessToken,
  parseGitHubUrl,
} from "!/lib/github";
import { importFromGitHub as importFromGitHubWorkflow } from "!/workflows/github-import";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from "unique-names-generator";
import { start } from "workflow/api";
import { z } from "zod";
import { requireAuth } from "./orpc";

const getProjects = requireAuth
  .input(z.number().positive().optional())
  .handler(async ({ context: { user }, input }) => {
    const projects = await db.query.project.findMany({
      where(fields, operators) {
        return operators.eq(fields.ownerId, user.id);
      },
      orderBy(fields, operators) {
        return operators.desc(fields.updatedAt);
      },
      limit: input,
    });

    return projects;
  });

const create = requireAuth.handler(async ({ context: { user } }) => {
  const projectName = uniqueNamesGenerator({
    dictionaries: [adjectives, animals, colors],
    separator: "-",
    length: 3,
  });

  await db.insert(schema.project).values({
    ownerId: user.id,
    name: projectName,
  });

  return true;
});

const getById = requireAuth
  .input(z.number())
  .handler(async ({ input, context: { user } }) => {
    const project = await db.query.project.findFirst({
      where(fields, operators) {
        return operators.and(
          operators.eq(fields.id, input),
          operators.eq(fields.ownerId, user.id),
        );
      },
    });

    if (!project) {
      throw new ORPCError("NOT_FOUND");
    }

    return project;
  });

const rename = requireAuth
  .input(z.object({ id: z.number(), name: z.string().min(1).max(100) }))
  .handler(async ({ input, context: { user } }) => {
    const project = await db.query.project.findFirst({
      where(fields, operators) {
        return operators.and(
          operators.eq(fields.id, input.id),
          operators.eq(fields.ownerId, user.id),
        );
      },
    });

    if (!project) {
      throw new ORPCError("NOT_FOUND");
    }

    await db
      .update(schema.project)
      .set({ name: input.name, updatedAt: new Date() })
      .where(eq(schema.project.id, input.id));

    return true;
  });

const remove = requireAuth
  .input(z.number())
  .handler(async ({ input, context: { user } }) => {
    const project = await db.query.project.findFirst({
      where(fields, operators) {
        return operators.and(
          operators.eq(fields.id, input),
          operators.eq(fields.ownerId, user.id),
        );
      },
    });

    if (!project) {
      throw new ORPCError("NOT_FOUND");
    }

    await db.delete(schema.project).where(eq(schema.project.id, input));

    return true;
  });

// 更新编辑器状态（activeTabId, previewTabId）
const updateEditorState = requireAuth
  .input(
    z.object({
      id: z.number(),
      activeTabId: z.number().nullable(),
      previewTabId: z.number().nullable(),
    }),
  )
  .handler(async ({ input, context: { user } }) => {
    await db
      .update(schema.project)
      .set({
        activeTabId: input.activeTabId,
        previewTabId: input.previewTabId,
      })
      .where(
        and(
          eq(schema.project.id, input.id),
          eq(schema.project.ownerId, user.id),
        ),
      );

    return true;
  });

// 从 GitHub 导入项目
const importFromGitHub = requireAuth
  .input(z.object({ url: z.url() }))
  .handler(async ({ input, context: { user } }) => {
    const parsed = parseGitHubUrl(input.url);
    if (!parsed) {
      throw new ORPCError("BAD_REQUEST", { message: "无效的 GitHub URL" });
    }

    const { owner, repo, branch, path } = parsed;

    // 获取用户的 GitHub access token
    const accessToken = await getGitHubAccessToken(user.id);
    const octokit = createOctokit(accessToken);

    // 检查是否能访问仓库
    const canAccess = await canAccessRepo(octokit, owner, repo);
    if (!canAccess) {
      if (accessToken) {
        throw new ORPCError("FORBIDDEN", {
          message: "无法访问该仓库，请确认仓库存在且您有访问权限",
        });
      }
      throw new ORPCError("FORBIDDEN", {
        message: "无法访问该仓库。如果是私有仓库，请先使用 GitHub 登录",
      });
    }

    // 创建项目，初始状态为 importing
    const [project] = await db
      .insert(schema.project)
      .values({
        ownerId: user.id,
        name: repo,
        importStatus: "importing",
      })
      .returning({ id: schema.project.id });

    // 使用 workflow 异步导入文件

    await start(importFromGitHubWorkflow, [
      {
        projectId: project.id,
        owner,
        repo,
        path,
        branch,
        accessToken,
      },
    ]);

    return { projectId: project.id };
  });

export const projectRouter = {
  getProjects,
  create,
  getById,
  rename,
  remove,
  updateEditorState,
  importFromGitHub,
};
