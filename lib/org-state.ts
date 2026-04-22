import type { OrganizationWithMembership } from "@/types";

export const ACTIVE_ORG_COOKIE = "societyos-active-org";
export const ACTIVE_ORG_STORAGE_KEY = "societyos.active-org-id";

export function resolveActiveOrganization(
  memberships: OrganizationWithMembership[],
  requestedOrgId?: string | null
) {
  if (!memberships.length) {
    return null;
  }

  return memberships.find((membership) => membership.id === requestedOrgId) ?? memberships[0];
}
