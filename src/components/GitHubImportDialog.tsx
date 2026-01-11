import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { FaGithub } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { client, orpcClient } from "@/lib/orpc";

interface GitHubImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GitHubImportDialog({
  open,
  onOpenChange,
}: GitHubImportDialogProps) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();
  const handleImport = async () => {
    if (!url.trim()) {
      setError("请输入 GitHub 仓库地址");
      return;
    }

    // 验证 GitHub URL 格式
    const githubUrlPattern =
      /^https?:\/\/github\.com\/([^/]+)\/([^/]+)(\/tree\/([^/]+)(\/(.*))?)?$/;
    const match = url.trim().match(githubUrlPattern);

    if (!match) {
      setError(
        "请输入有效的 GitHub 仓库地址，例如: https://github.com/owner/repo",
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await client.project.importFromGitHub({ url: url.trim() });
      if (result) {
        queryClient.refetchQueries({
          queryKey: orpcClient.project.getProjects.queryKey(),
        });
        nav({
          to: "/projects/$projectId",
          params: { projectId: String(result.projectId) },
        });
        onOpenChange(false);
        setUrl("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FaGithub className="size-5" />从 GitHub 导入
          </DialogTitle>
          <DialogDescription>
            输入 GitHub 仓库地址导入项目。支持公开仓库。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Input
            placeholder="https://github.com/owner/repo"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) {
                handleImport();
              }
            }}
            disabled={loading}
          />
          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            取消
          </Button>
          <Button onClick={handleImport} disabled={loading}>
            {loading && <Loader2Icon className="mr-2 size-4 animate-spin" />}
            导入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
