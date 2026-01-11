"use client";

import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LogOutIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import { orpcClient } from "@/lib/orpc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function UserButton() {
  const { data: currentUser } = useSuspenseQuery(
    orpcClient.profile.getCurrentUser.queryOptions(),
  );

  const nav = useNavigate();
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    await authClient.signOut();
    // 清除 TanStack Query 缓存
    queryClient.clear();
    nav({ to: "/sign-in" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none">
        <Avatar>
          <AvatarImage src={currentUser.image || ""} />
          <AvatarFallback>{currentUser.name}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center gap-2 p-2">
          <Avatar>
            <AvatarImage src={currentUser.image || ""} />
            <AvatarFallback>{currentUser.name}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            {currentUser.name && (
              <span className="truncate font-medium text-sm">
                {currentUser.name}
              </span>
            )}
            <span className="truncate text-muted-foreground text-xs">
              {currentUser.email}
            </span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOutIcon className="mr-2 size-4" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
