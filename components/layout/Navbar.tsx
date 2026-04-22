"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Bell, ChevronsUpDown, LogOut, Search, User } from "lucide-react";
import { useRouter } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CommandMenu } from "@/components/layout/CommandMenu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { UserRow } from "@/types";

type NavbarProps = {
  title: string;
  user: UserRow;
  notificationCount?: number;
};

function getInitials(name: string | null, email: string | null) {
  const value = name ?? email ?? "User";

  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Navbar({ title, user, notificationCount = 0 }: NavbarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const signOut = () => {
    startTransition(async () => {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    });
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b border-border bg-[color-mix(in_srgb,var(--background)_78%,transparent)] px-6 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        </div>
        <div className="flex-1" />
        <Button variant="outline" className="hidden min-w-[240px] justify-between md:inline-flex" onClick={() => setMenuOpen(true)}>
          <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
            <Search className="h-4 w-4" />
            Search
          </span>
          <span className="rounded-md border border-border px-2 py-0.5 text-xs text-[var(--text-muted)]">⌘K</span>
        </Button>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
            {notificationCount}
          </span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 rounded-full border border-border bg-[var(--surface)] pl-1 pr-3 py-1 transition-colors hover:bg-[var(--surface-2)]">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name ?? user.email ?? "User"} />
                <AvatarFallback>{getInitials(user.full_name, user.email)}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="max-w-[160px] truncate text-sm font-medium text-foreground">{user.full_name ?? "Unnamed user"}</p>
                <p className="max-w-[160px] truncate text-xs text-[var(--text-secondary)]">{user.email ?? "No email"}</p>
              </div>
              <ChevronsUpDown className="hidden h-4 w-4 text-[var(--text-secondary)] sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <User className="h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut} disabled={isPending}>
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <CommandMenu open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
}
