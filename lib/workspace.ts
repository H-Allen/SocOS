import type { MembershipRole, PermissionLevel } from "@/types";

export const ADMIN_ROLES = ["president", "secretary", "treasurer"] as const;
export const COMMITTEE_ROLES = ["committee"] as const;

export const SOCIETY_ROLE_OPTIONS: Array<{
  value: MembershipRole;
  label: string;
  permissionLevel: PermissionLevel;
  description: string;
}> = [
  {
    value: "president",
    label: "President",
    permissionLevel: "admin",
    description: "Full admin power and complete visibility across the society."
  },
  {
    value: "secretary",
    label: "Secretary",
    permissionLevel: "admin",
    description: "Full admin power, including members, meetings, handovers, and records."
  },
  {
    value: "treasurer",
    label: "Treasurer",
    permissionLevel: "admin",
    description: "Full admin power, including finances, resources, and role management."
  },
  {
    value: "committee",
    label: "Committee",
    permissionLevel: "committee",
    description: "Can manage operational content such as handovers, resources, tasks, and meetings."
  },
  {
    value: "member",
    label: "Member",
    permissionLevel: "member",
    description: "Can log in, explore society information, and view member-facing content."
  }
];

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

export function permissionForRole(role: MembershipRole): PermissionLevel {
  if ((ADMIN_ROLES as readonly string[]).includes(role)) return "admin";
  if ((COMMITTEE_ROLES as readonly string[]).includes(role)) return "committee";
  return "member";
}

export function canChangeRoles(permissionLevel: PermissionLevel | null | undefined) {
  return isAdmin(permissionLevel);
}

export function roleHasCommitteeAccess(permissionLevel: PermissionLevel | null | undefined) {
  return canManageWorkspace(permissionLevel);
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
