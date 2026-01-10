import { db, schema } from "!/lib/db";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "./orpc";

const create = requireAuth
  .input(
    z.object({
      projectId: z.number(),
      name: z.string().min(1),
      parentId: z.number().optional(),
      type: z.enum(["file", "folder"]),
      content: z.string().optional(),
    }),
  )
  .handler(async ({ input }) => {
    const [file] = await db
      .insert(schema.file)
      .values({
        projectId: input.projectId,
        type: input.type,
        parentId: input.parentId,
        name: input.name,
        content: input.content,
      })
      .returning({ id: schema.file.id });

    return file.id;
  });

export type FileTreeNode = {
  id: number;
  name: string;
  type: "file" | "folder";
  isOpen: boolean;
  children?: FileTreeNode[];
};

const getFileTree = requireAuth
  .input(z.object({ projectId: z.number() }))
  .handler(async ({ input }) => {
    const files = await db
      .select()
      .from(schema.file)
      .where(eq(schema.file.projectId, input.projectId));

    const buildTree = (parentId: number | null): FileTreeNode[] => {
      return files
        .filter((f) => f.parentId === parentId)
        .map((f) => ({
          id: f.id,
          name: f.name,
          type: f.type,
          isOpen: f.isOpen,
          ...(f.type === "folder" ? { children: buildTree(f.id) } : {}),
        }));
    };

    return buildTree(null);
  });

const move = requireAuth
  .input(
    z.object({
      id: z.number(),
      parentId: z.number().nullable(),
    }),
  )
  .handler(async ({ input }) => {
    // 不能移动到自身
    if (input.id === input.parentId) {
      return false;
    }

    // 检查是否将父目录移动到子目录（会导致循环）
    if (input.parentId !== null) {
      const isDescendant = async (
        ancestorId: number,
        targetId: number,
      ): Promise<boolean> => {
        const target = await db
          .select()
          .from(schema.file)
          .where(eq(schema.file.id, targetId))
          .then((rows) => rows[0]);

        if (!target || target.parentId === null) {
          return false;
        }
        if (target.parentId === ancestorId) {
          return true;
        }
        return isDescendant(ancestorId, target.parentId);
      };

      if (await isDescendant(input.id, input.parentId)) {
        return false;
      }
    }

    await db
      .update(schema.file)
      .set({ parentId: input.parentId })
      .where(eq(schema.file.id, input.id));
    return true;
  });

const rename = requireAuth
  .input(
    z.object({
      id: z.number(),
      name: z.string().min(1),
    }),
  )
  .handler(async ({ input }) => {
    await db
      .update(schema.file)
      .set({ name: input.name })
      .where(eq(schema.file.id, input.id));
    return true;
  });

const remove = requireAuth
  .input(z.object({ id: z.number() }))
  .handler(async ({ input }) => {
    // 递归删除子文件/文件夹
    const deleteRecursive = async (id: number) => {
      const children = await db
        .select()
        .from(schema.file)
        .where(eq(schema.file.parentId, id));

      for (const child of children) {
        await deleteRecursive(child.id);
      }

      await db.delete(schema.file).where(eq(schema.file.id, id));
    };

    await deleteRecursive(input.id);
    return true;
  });

const getById = requireAuth.input(z.number()).handler(async ({ input }) => {
  const file = await db.query.file.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, input);
    },
  });
  if (!file) {
    throw new ORPCError("NOT_FOUND");
  }
  return file;
});

const getNameById = requireAuth.input(z.number()).handler(async ({ input }) => {
  const file = await db.query.file.findFirst({
    where(fields, operators) {
      return operators.eq(fields.id, input);
    },
  });
  if (!file) {
    throw new ORPCError("NOT_FOUND");
  }
  return file.name;
});

const getPathById = requireAuth.input(z.number()).handler(async ({ input }) => {
  const pathParts: { name: string; id: number; parentId: number | null }[] = [];
  let currentId: number | null = input;

  while (currentId !== null) {
    const file = await db.query.file.findFirst({
      where(fields, operators) {
        return operators.eq(fields.id, currentId as number);
      },
      columns: {
        id: true,
        name: true,
        parentId: true,
      },
    });
    if (!file) {
      throw new ORPCError("NOT_FOUND");
    }

    pathParts.unshift(file);
    currentId = file.parentId;
  }
  return pathParts;
});

const updateContent = requireAuth
  .input(
    z.object({
      id: z.number(),
      content: z.string(),
      projectId: z.number(),
    }),
  )
  .handler(async ({ input }) => {
    await db
      .update(schema.file)
      .set({ content: input.content })
      .where(
        and(
          eq(schema.file.id, input.id),
          eq(schema.file.projectId, input.projectId),
        ),
      );

    // 更新项目的更新时间
    await db
      .update(schema.project)
      .set({ updatedAt: new Date() })
      .where(eq(schema.project.id, input.projectId));

    return true;
  });

// 更新文件/文件夹的打开状态
const updateOpen = requireAuth
  .input(
    z.object({
      id: z.number(),
      isOpen: z.boolean(),
    }),
  )
  .handler(async ({ input }) => {
    await db
      .update(schema.file)
      .set({ isOpen: input.isOpen })
      .where(eq(schema.file.id, input.id));
    return true;
  });

// 批量关闭所有文件夹
const collapseAll = requireAuth
  .input(z.object({ projectId: z.number() }))
  .handler(async ({ input }) => {
    await db
      .update(schema.file)
      .set({ isOpen: false })
      .where(
        and(
          eq(schema.file.projectId, input.projectId),
          eq(schema.file.type, "folder"),
        ),
      );
    return true;
  });

export const fileRouter = {
  create,
  getFileTree,
  move,
  rename,
  remove,
  getById,
  getNameById,
  getPathById,
  updateContent,
  updateOpen,
  collapseAll,
};
