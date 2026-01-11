import { Octokit } from "octokit";
import { db, schema } from "./db";

// 解析 GitHub URL，提取 owner、repo、branch 和 path
export function parseGitHubUrl(url: string) {
  const pattern =
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/tree\/([^/]+)(\/(.*))?)?$/;
  const match = url.match(pattern);

  if (!match) {
    return null;
  }

  return {
    owner: match[1],
    repo: match[2],
    branch: match[3] || undefined,
    path: match[5] || "",
  };
}

// 获取用户的 GitHub access token
export async function getGitHubAccessToken(
  userId: string,
): Promise<string | null> {
  const account = await db.query.account.findFirst({
    where(fields, operators) {
      return operators.and(
        operators.eq(fields.userId, userId),
        operators.eq(fields.providerId, "github"),
      );
    },
  });
  return account?.accessToken ?? null;
}

// 创建 Octokit 实例（带或不带认证）
export function createOctokit(accessToken?: string | null) {
  return new Octokit(accessToken ? { auth: accessToken } : undefined);
}

// 检查是否能访问仓库
export async function canAccessRepo(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<boolean> {
  try {
    await octokit.rest.repos.get({ owner, repo });
    return true;
  } catch {
    return false;
  }
}

// 获取仓库默认分支
export async function getDefaultBranch(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<string> {
  const { data } = await octokit.rest.repos.get({ owner, repo });
  return data.default_branch;
}

// 从 GitHub API 获取仓库内容（类型安全）
export async function fetchGitHubContents(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref: string,
) {
  const { data } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
    ref,
  });

  return Array.isArray(data) ? data : [data];
}

// 递归获取文件内容并创建文件
export async function importGitHubFiles(
  octokit: Octokit,
  projectId: number,
  owner: string,
  repo: string,
  path: string,
  ref: string,
  parentId: number | null = null,
) {
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

      await importGitHubFiles(
        octokit,
        projectId,
        owner,
        repo,
        item.path,
        ref,
        folder.id,
      );
    } else if (item.type === "file") {
      // 跳过大文件（> 1MB）
      if (item.size > 1024 * 1024) {
        continue;
      }

      let content = "";
      try {
        if (item.download_url) {
          const fileResponse = await fetch(item.download_url);
          if (fileResponse.ok) {
            content = await fileResponse.text();
          }
        }
      } catch {
        continue;
      }

      await db.insert(schema.file).values({
        projectId,
        type: "file",
        parentId,
        name: item.name,
        content,
      });
    }
  }
}
