import { db, schema } from "!/lib/db";
import {
  createOctokit,
  fetchGitHubContents,
  getDefaultBranch,
} from "!/lib/github";
import { storage } from "!/lib/storage";
import { eq } from "drizzle-orm";
import { FatalError } from "workflow";
import {
  getMimeType,
  isBinaryFile,
  shouldIgnoreFile,
  UPLOAD_CONFIG,
} from "#/upload-config";

type GitHubImportInput = {
  projectId: number;
  owner: string;
  repo: string;
  path: string;
  branch?: string;
  accessToken: string | null;
};

export async function importFromGitHub(input: GitHubImportInput) {
  "use workflow";

  const { projectId, owner, repo, path, branch, accessToken } = input;

  try {
    // 获取默认分支
    let ref = branch || "";
    if (!ref) {
      ref = await getDefaultBranchStep(accessToken, owner, repo);
    }

    // 递归导入文件
    await importFilesRecursive(
      accessToken,
      projectId,
      owner,
      repo,
      path,
      ref,
      null,
    );

    // 标记导入完成
    await markImportCompleted(projectId);

    return { success: true, projectId };
  } catch (e) {
    console.error("GitHub import workflow failed:", e);
    await markImportFaild(projectId);
    throw new FatalError("GitHub import workflow failed");
  }
}

async function getDefaultBranchStep(
  accessToken: string | null,
  owner: string,
  repo: string,
) {
  "use step";

  const octokit = createOctokit(accessToken);

  try {
    return await getDefaultBranch(octokit, owner, repo);
  } catch (error) {
    throw new FatalError(
      `无法获取仓库信息: ${error instanceof Error ? error.message : "未知错误"}`,
    );
  }
}

async function importFilesRecursive(
  accessToken: string | null,
  projectId: number,
  owner: string,
  repo: string,
  path: string,
  ref: string,
  parentId: number | null,
) {
  "use step";
  const octokit = createOctokit(accessToken);

  const contents = await fetchGitHubContents(octokit, owner, repo, path, ref);

  for (const item of contents) {
    if (item.type === "dir") {
      const [folder] = await db
        .insert(schema.file)
        .values({
          projectId,
          type: "folder",
          parentId,
          name: item.name,
          isOpen: false,
        })
        .returning({ id: schema.file.id });

      // 递归导入子目录
      await importFilesRecursive(
        accessToken,
        projectId,
        owner,
        repo,
        item.path,
        ref,
        folder.id,
      );
    } else if (item.type === "file") {
      // 跳过不需要导入的文件
      if (shouldIgnoreFile(item.name)) {
        continue;
      }

      // 跳过大文件（> 10MB）
      if (item.size > UPLOAD_CONFIG.maxFileSize) {
        continue;
      }

      const isBinary = isBinaryFile(item.name);

      try {
        if (!item.download_url) continue;

        const fileResponse = await fetch(item.download_url);
        if (!fileResponse.ok) continue;

        if (isBinary) {
          // 二进制文件：保存到 storage
          const buffer = Buffer.from(await fileResponse.arrayBuffer());
          const fileUrl = await storage.upload(buffer, item.name);
          const mimeType = getMimeType(item.name);

          await db.insert(schema.file).values({
            projectId,
            type: "file",
            parentId,
            name: item.name,
            mimeType,
            fileUrl,
          });
        } else {
          // 文本文件：保存内容
          const content = await fileResponse.text();

          await db.insert(schema.file).values({
            projectId,
            type: "file",
            parentId,
            name: item.name,
            content,
          });
        }
        const buffer = Buffer.from(await fileResponse.arrayBuffer());

        // 检测是否为二进制内容（包含 null 字节）
        const hasNullByte = buffer.includes(0x00);

        if (isBinary) {
          // 已知二进制类型：保存到 storage
          const fileUrl = await storage.upload(buffer, item.name);
          const mimeType = getMimeType(item.name);

          await db.insert(schema.file).values({
            projectId,
            type: "file",
            parentId,
            name: item.name,
            mimeType,
            fileUrl,
          });
        } else if (hasNullByte) {
        } else {
          // 文本文件：保存内容
          const content = buffer.toString("utf-8");

          await db.insert(schema.file).values({
            projectId,
            type: "file",
            parentId,
            name: item.name,
            content,
          });
        }
      } catch (e) {
        console.log("发生错误", e);
      }
    }
  }
}

importFilesRecursive.maxRetries = 0;

async function markImportCompleted(projectId: number) {
  "use step";
  await db
    .update(schema.project)
    .set({ importStatus: "completed" })
    .where(eq(schema.project.id, projectId));
}

async function markImportFaild(projectId: number) {
  "use step";
  await db
    .update(schema.project)
    .set({ importStatus: "failed" })
    .where(eq(schema.project.id, projectId));
}
