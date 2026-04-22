import { cookies } from "next/headers";

import { ACTIVE_ORG_COOKIE, resolveActiveOrganization } from "@/lib/org-state";
import type { OrganizationWithMembership } from "@/types";

export function getServerActiveOrganization(memberships: OrganizationWithMembership[]) {
  const cookieStore = cookies();
  const requestedOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null;

  return resolveActiveOrganization(memberships, requestedOrgId);
}
