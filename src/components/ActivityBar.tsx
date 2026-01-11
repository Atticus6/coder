"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  CloudCheckIcon,
  FileTextIcon,
  FolderIcon,
  HomeIcon,
  LoaderIcon,
  PencilIcon,
  SettingsIcon,
  TrashIcon,
} from "lucide-react";

import { useState } from "react";
import { toast } from "sonner";
import { orpcClient } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { UserButton } from "./UserButton";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function ActivityBar() {
  const projectId = useParams({
    strict: false,
    select(params) {
      return Number(params.projectId);
    },
  });
  const [activeItem, setActiveItem] = useState("files");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: project } = useQuery(
    orpcClient.project.getById.queryOptions({
      input: Number(projectId),
      refetchInterval: 60 * 1000,
      refetchIntervalInBackground: false,
    }),
  );

  // 项目重命名
  const renameProjectMutation = useMutation(
    orpcClient.project.rename.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpcClient.project.getById.queryKey({
            input: Number(projectId),
          }),
        });
        setRenameOpen(false);
        toast.success("The project has been renamed");
      },
      onError: (error) => {
        toast.error("Rename failed", { description: error.message });
      },
    }),
  );

  // 项目删除
  const deleteProjectMutation = useMutation(
    orpcClient.project.remove.mutationOptions({
      onSuccess: () => {
        toast.success("项目已删除");
        navigate({ to: "/" });
      },
      onError: (error) => {
        toast.error("删除失败", { description: error.message });
      },
    }),
  );

  const handleRenameProject = () => {
    if (newProjectName.trim() && newProjectName !== project?.name) {
      renameProjectMutation.mutate({
        id: Number(projectId),
        name: newProjectName.trim(),
      });
    } else {
      setRenameOpen(false);
    }
  };

  const handleDeleteProject = () => {
    deleteProjectMutation.mutate(Number(projectId));
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const navItems = [
    { id: "home", icon: HomeIcon, label: "Home", href: "/" },
    { id: "files", icon: FolderIcon, label: "Files" },
    { id: "docs", icon: FileTextIcon, label: "Documents" },
    { id: "settings", icon: SettingsIcon, label: "Settings" },
  ];

  return (
    <nav className="flex h-full w-12 flex-col items-center border-r bg-sidebar py-2">
      {/* Logo */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to="/"
            className="mb-4 flex size-10 items-center justify-center rounded-md"
          >
            <img src="/vercel.svg" alt="Logo" className="h-6 w-6" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">Polaris</TooltipContent>
      </Tooltip>

      {/* 导航图标 */}
      <div className="flex flex-1 flex-col items-center gap-1">
        {navItems.map((item) => (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>
              {item.href ? (
                <Link
                  to={item.href}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-md text-muted-foreground",
                    activeItem === item.id && "border-l-2 text-foreground",
                  )}
                >
                  <item.icon className="size-5" />
                </Link>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-10 text-muted-foreground",
                    activeItem === item.id && "border-l-2 text-foreground",
                  )}
                  onClick={() => {
                    if (item.id === "settings") {
                      handleSettingsClick();
                    } else {
                      setActiveItem(item.id);
                    }
                  }}
                >
                  <item.icon className="size-5" />
                </Button>
              )}
            </TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* 底部状态和用户 */}
      <div className="flex flex-col items-center gap-2">
        {/* 同步状态 */}
        {project?.importStatus === "importing" ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex size-10 items-center justify-center">
                <LoaderIcon className="size-4 animate-spin text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">Importing...</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex size-10 items-center justify-center">
                <CloudCheckIcon className="size-4 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              Saved{" "}
              {project?.updatedAt
                ? formatDistanceToNow(project.updatedAt, { addSuffix: true })
                : "Loading..."}
            </TooltipContent>
          </Tooltip>
        )}

        {/* 用户头像 */}
        <UserButton />
      </div>

      {/* 设置弹窗 */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Project Settings</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => {
                setNewProjectName(project?.name ?? "");
                setSettingsOpen(false);
                setRenameOpen(true);
              }}
            >
              <PencilIcon className="size-4" />
              Rename
            </Button>
            <Button
              variant="outline"
              className="justify-start text-destructive hover:text-destructive"
              onClick={() => {
                setSettingsOpen(false);
                setDeleteOpen(true);
              }}
            >
              <TrashIcon className="size-4" />
              delete project
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 重命名项目对话框 */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
          </DialogHeader>
          <Input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="project name"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameProject();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cannel
            </Button>
            <Button
              onClick={handleRenameProject}
              disabled={renameProjectMutation.isPending}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除项目确认对话框 */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            确定要删除项目 "{project?.name}" 吗？此操作不可撤销。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cannel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={deleteProjectMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </nav>
  );
}
