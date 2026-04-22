"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { ACTIVE_ORG_COOKIE, ACTIVE_ORG_STORAGE_KEY, resolveActiveOrganization } from "@/lib/org-state";
import type { OrganizationWithMembership } from "@/types";

type OrgContextValue = {
  currentOrg: OrganizationWithMembership | null;
  memberships: OrganizationWithMembership[];
  setCurrentOrg: (organizationId: string) => void;
};

const OrgContext = createContext<OrgContextValue | undefined>(undefined);

type OrgProviderProps = {
  memberships: OrganizationWithMembership[];
  initialOrgId?: string | null;
  children: React.ReactNode;
};

function persistActiveOrganizationSelection(organizationId: string) {
  window.localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, organizationId);
  document.cookie = `${ACTIVE_ORG_COOKIE}=${organizationId}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export function OrgProvider({ memberships, initialOrgId, children }: OrgProviderProps) {
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(initialOrgId ?? memberships[0]?.id ?? null);

  useEffect(() => {
    if (!memberships.length) {
      setCurrentOrgId(null);
      return;
    }

    const storedOrgId = window.localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
    const nextOrgId = resolveActiveOrganization(memberships, storedOrgId ?? initialOrgId)?.id ?? memberships[0].id;

    setCurrentOrgId(nextOrgId);
    if (nextOrgId) {
      persistActiveOrganizationSelection(nextOrgId);
    }
  }, [initialOrgId, memberships]);

  const value = useMemo<OrgContextValue>(() => {
    const currentOrg = resolveActiveOrganization(memberships, currentOrgId);

    return {
      currentOrg,
      memberships,
      setCurrentOrg: (organizationId: string) => {
        setCurrentOrgId(organizationId);
        persistActiveOrganizationSelection(organizationId);
      }
    };
  }, [currentOrgId, memberships]);

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const context = useContext(OrgContext);

  if (!context) {
    throw new Error("useOrg must be used inside OrgProvider.");
  }

  return context;
}
