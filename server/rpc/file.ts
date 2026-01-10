import { db, schema } from "!/lib/db";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "./orpc";

// 辅助函数：根据路径获取或创建父文件夹，返回最终的 parentId、文件名和新创建的文件夹 id 列表
const resolvePathAndCreateFolders = async (
  projectId: number,
  name: string,
  parentId: number | null,
  excludeId?: number, // 排除的文件夹 id（用于 rename 时排除自身）
): Promise<{
  parentId: number | null;
  fileName: string;
  createdFolderIds: number[];
}> => {
  const parts = name.split("/").filter((p) => p.length > 0);
  if (parts.length <= 1) {
    return { parentId, fileName: name, createdFolderIds: [] };
  }

  const fileName = parts.pop()!;
  let currentParentId = parentId;
  const createdFolderIds: number[] = [];

  for (const folderName of parts) {
    // 查找是否已存在该文件夹（排除 excludeId）
    const existing = await db.query.file.findFirst({
      where(fields, operators) {
        const conditions = [
          operators.eq(fields.projectId, projectId),
          operators.eq(fields.name, folderName),
          operators.eq(fields.type, "folder"),
          currentParentId === null
            ? operators.isNull(fields.parentId)
            : operators.eq(fields.parentId, currentParentId),
        ];
        if (excludeId !== undefined) {
          conditions.push(operators.ne(fields.id, excludeId));
        }
        return operators.and(...conditions);
      },
    });

    if (existing) {
      currentParentId = existing.id;
    } else {
      // 创建文件夹
      const [newFolder] = await db
        .insert(schema.file)
        .values({
          projectId,
          type: "folder",
          parentId: currentParentId,
          name: folderName,
          isOpen: true,
        })
        .returning({ id: schema.file.id });
      currentParentId = newFolder.id;
      createdFolderIds.push(newFolder.id);
    }
  }

  return { parentId: currentParentId, fileName, createdFolderIds };
};

const create = requireAuth
  .input(
    z.object({
      projectId: z.number(),
      name: z.string().min(1),
      parentId: z.number().optional(),
      type: z.enum(["file", "folder"]),
      content: z.string().optional(),
      mimeType: z.string().optional(),
      fileUrl: z.string().optional(),
    }),
  )
  .handler(async ({ input }) => {
    // 解析路径，自动创建中间文件夹
    const { parentId, fileName, createdFolderIds } =
      await resolvePathAndCreateFolders(
        input.projectId,
        input.name,
        input.parentId ?? null,
      );

    // 检查同名文件/文件夹是否已存在
    const existing = await db.query.file.findFirst({
      where(fields, operators) {
        return operators.and(
          operators.eq(fields.projectId, input.projectId),
          operators.eq(fields.name, fileName),
          operators.eq(fields.type, input.type),
          parentId === null
            ? operators.isNull(fields.parentId)
            : operators.eq(fields.parentId, parentId),
        );
      },
    });

    if (existing) {
      // 如果是文件夹且已存在，直接返回已存在的 id
      if (input.type === "folder") {
        return { id: existing.id, createdFolderIds };
      }
      // 如果是文件且已存在，抛出错误
      throw new ORPCError("CONFLICT");
    }

    const [file] = await db
      .insert(schema.file)
      .values({
        projectId: input.projectId,
        type: input.type,
        parentId,
        name: fileName,
        content: input.content,
        mimeType: input.mimeType,
        fileUrl: input.fileUrl,
      })
      .returning({ id: schema.file.id });

    return { id: file.id, createdFolderIds };
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
      projectId: z.number(),
    }),
  )
  .handler(async ({ input }) => {
    // 获取原文件信息，以其 parentId 作为基准路径
    const originalFile = await db.query.file.findFirst({
      where(fields, operators) {
        return operators.eq(fields.id, input.id);
      },
    });

    if (!originalFile) {
      throw new ORPCError("NOT_FOUND");
    }

    // 解析路径，基于原文件的 parentId 创建中间文件夹（排除自身避免重复）
    const { parentId, fileName, createdFolderIds } =
      await resolvePathAndCreateFolders(
        input.projectId,
        input.name,
        originalFile.parentId,
        input.id, // 排除自身
      );

    await db
      .update(schema.file)
      .set({ name: fileName, parentId })
      .where(eq(schema.file.id, input.id));
    return { success: true, createdFolderIds };
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
