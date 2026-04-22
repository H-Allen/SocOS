import type { MembershipRole, PermissionLevel } from "@/types";

export const RESOURCE_CATEGORIES = [
  "Governance",
  "Finance",
  "Events",
  "Sponsorship",
  "Operations",
  "Marketing"
] as const;

export function getInitials(name: string | null, email: string | null) {
  const value = name ?? email ?? "User";

  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function canManageWorkspace(permissionLevel: PermissionLevel | null | undefined) {
  return permissionLevel === "admin" || permissionLevel === "committee";
}

export function isAdmin(permissionLevel: PermissionLevel | null | undefined) {
  return permissionLevel === "admin";
}

export function getRoleBadgeClasses(role: MembershipRole) {
  if (role === "president") {
    return "bg-indigo-100 text-indigo-700";
  }

  if (role === "secretary") {
    return "bg-sky-100 text-sky-700";
  }

  if (role === "treasurer") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (role === "committee") {
    return "bg-slate-200 text-slate-700";
  }

  return "bg-[var(--surface-2)] text-[var(--text-secondary)]";
}

export function formatRoleLabel(role: string) {
  return role
    .split("_")
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}
