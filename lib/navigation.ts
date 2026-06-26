import {
  BookOpen,
  Calendar,
  CalendarDays,
  CheckSquare,
  ExternalLink,
  FolderOpen,
  LayoutDashboard,
  Megaphone,
  Network,
  Users
} from "lucide-react";
import type { ComponentType } from "react";

import type { Json } from "@/types";

export type BuiltInNavId =
  | "dashboard"
  | "tasks"
  | "meetings"
  | "resources"
  | "handovers"
  | "members"
  | "teams"
  | "calendar"
  | "announcements";

export type CustomNavItem = {
  id: string;
  label: string;
  href: string;
  visibleToMembers: boolean;
};

export type NavigationConfig = {
  visibleBuiltIns: BuiltInNavId[];
  customItems: CustomNavItem[];
};

export type NavItem = {
  id: BuiltInNavId | string;
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  custom?: boolean;
};

export const builtInNavItems: Array<NavItem & { id: BuiltInNavId; description: string }> = [
  { id: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Home, profile, updates, and personal onboarding." },
  { id: "tasks", href: "/tasks", label: "Tasks", icon: CheckSquare, description: "Society, team, and personal work tracking." },
  { id: "meetings", href: "/meetings", label: "Meetings", icon: Calendar, description: "Committee meetings, notes, and action items." },
  { id: "resources", href: "/resources", label: "Resources", icon: FolderOpen, description: "Files, links, and notes for the society." },
  { id: "handovers", href: "/handovers", label: "Handovers", icon: BookOpen, description: "Institutional knowledge for role transitions." },
  { id: "members", href: "/members", label: "Members", icon: Users, description: "Read-only member directory." },
  { id: "teams", href: "/teams", label: "Teams", icon: Network, description: "Team cockpit, team leads, and team induction." },
  { id: "calendar", href: "/calendar", label: "Calendar", icon: CalendarDays, description: "Meetings, tasks, and society events." },
  { id: "announcements", href: "/announcements", label: "Announcements", icon: Megaphone, description: "Pinned and recent society updates." }
];

export const defaultNavigationConfig: NavigationConfig = {
  visibleBuiltIns: builtInNavItems.map((item) => item.id),
  customItems: []
};

function isBuiltInNavId(value: unknown): value is BuiltInNavId {
  return typeof value === "string" && builtInNavItems.some((item) => item.id === value);
}

function parseCustomItems(value: unknown): CustomNavItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Record<string, unknown>;
      if (typeof candidate.label !== "string" || typeof candidate.href !== "string") return null;
      const label = candidate.label.trim();
      const href = candidate.href.trim();
      if (!label || !href) return null;
      return {
        id: typeof candidate.id === "string" && candidate.id ? candidate.id : `custom-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        label,
        href,
        visibleToMembers: candidate.visibleToMembers !== false
      };
    })
    .filter(Boolean) as CustomNavItem[];
}

export function parseNavigationConfig(value: Json | null | undefined): NavigationConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaultNavigationConfig;
  const candidate = value as Record<string, unknown>;
  const visibleBuiltIns = Array.isArray(candidate.visibleBuiltIns)
    ? candidate.visibleBuiltIns.filter(isBuiltInNavId)
    : defaultNavigationConfig.visibleBuiltIns;

  return {
    visibleBuiltIns: visibleBuiltIns.length ? visibleBuiltIns : defaultNavigationConfig.visibleBuiltIns,
    customItems: parseCustomItems(candidate.customItems)
  };
}

export function getNavigationItems(configValue: Json | null | undefined, includeMemberHiddenCustom = true): NavItem[] {
  const config = parseNavigationConfig(configValue);
  const builtIns = builtInNavItems.filter((item) => config.visibleBuiltIns.includes(item.id));
  const customItems = config.customItems
    .filter((item) => includeMemberHiddenCustom || item.visibleToMembers)
    .map((item) => ({
      id: item.id,
      href: item.href,
      label: item.label,
      icon: ExternalLink,
      custom: true
    }));

  return [...builtIns, ...customItems];
}
