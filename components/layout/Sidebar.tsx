"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  BookOpen,
  Calendar,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronDown,
  FolderOpen,
  LayoutDashboard,
  Megaphone,
  Settings,
  Users
} from "lucide-react";

import { useOrg } from "@/lib/org-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/cn";
import type { UserRow } from "@/types";

const navItems: Array<{ href: Route; label: string; icon: ComponentType<{ className?: string }> }> = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/meetings", label: "Meetings", icon: Calendar },
  { href: "/resources", label: "Resources", icon: FolderOpen },
  { href: "/handovers", label: "Handovers", icon: BookOpen },
  { href: "/members", label: "Members", icon: Users },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/announcements", label: "Announcements", icon: Megaphone }
];

const settingsHref: Route = "/settings";

type SidebarProps = {
  user: UserRow;
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

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const { currentOrg, memberships, setCurrentOrg } = useOrg();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex h-screen w-[240px] flex-col border-r border-border bg-[var(--surface)]">
      <div className="border-b border-border px-4 pb-4 pt-5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-xl border border-border bg-[var(--surface-2)] px-3 py-3 text-left transition-colors hover:border-[color-mix(in_srgb,var(--accent)_36%,var(--border))] hover:bg-[color-mix(in_srgb,var(--surface-2)_80%,var(--accent)_20%)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-sm font-semibold text-primary">
                {currentOrg?.name.slice(0, 2).toUpperCase() ?? "SO"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{currentOrg?.name ?? "No organization"}</p>
                <p className="truncate text-xs text-[var(--text-secondary)]">{currentOrg?.university ?? "Switch workspace"}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[220px]">
            <DropdownMenuLabel>Organizations</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {memberships.map((membership) => (
              <DropdownMenuItem key={membership.id} onSelect={() => setCurrentOrg(membership.id)}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{membership.name}</p>
                  <p className="truncate text-xs text-[var(--text-secondary)]">
                    {membership.membership.role.replace("_", " ")}
                  </p>
                </div>
                {currentOrg?.id === membership.id ? <Check className="h-4 w-4 text-primary" /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "group relative flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "absolute inset-y-2 left-0 w-0.5 rounded-full bg-transparent",
                      isActive && "bg-primary"
                    )}
                  />
                  <Icon className="mr-3 h-4 w-4" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-3">
        <Link
          href={settingsHref}
          className={cn(
            "mb-2 flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
            pathname === settingsHref
              ? "bg-primary/10 text-primary"
              : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-foreground"
          )}
        >
          <Settings className="mr-3 h-4 w-4" />
          Settings
        </Link>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-[var(--surface-2)] px-3 py-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name ?? user.email ?? "User"} />
            <AvatarFallback>{getInitials(user.full_name, user.email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{user.full_name ?? "Unnamed user"}</p>
            <p className="truncate text-xs text-[var(--text-secondary)]">{user.email ?? "No email available"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
