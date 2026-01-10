"use client";

import { useNavigate } from "@tanstack/react-router";
import { LogOutIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function UserButton() {
  const { data: session, isPending } = authClient.useSession();

  const nav = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut();
    nav({ to: "/sign-in" });
  };

  if (isPending) {
    return <div className="size-8 animate-pulse rounded-full bg-muted" />;
  }

  if (!session?.user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none">
        <Avatar>
          <AvatarImage src={session.user.image || ""} />
          <AvatarFallback>{session.user.name}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center gap-2 p-2">
          <Avatar>
            <AvatarImage src={session.user.image || ""} />
            <AvatarFallback>{session.user.name}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            {session.user.name && (
              <span className="truncate font-medium text-sm">
                {session.user.name}
              </span>
            )}
            <span className="truncate text-muted-foreground text-xs">
              {session.user.email}
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
