"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { OrganizationWithMembership } from "@/types";

type OrgContextValue = {
  currentOrg: OrganizationWithMembership | null;
  memberships: OrganizationWithMembership[];
  setCurrentOrg: (organizationId: string) => void;
};

const OrgContext = createContext<OrgContextValue | undefined>(undefined);
const ORG_STORAGE_KEY = "societyos.active-org-id";

type OrgProviderProps = {
  memberships: OrganizationWithMembership[];
  children: React.ReactNode;
};

export function OrgProvider({ memberships, children }: OrgProviderProps) {
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(memberships[0]?.id ?? null);

  useEffect(() => {
    if (!memberships.length) {
      setCurrentOrgId(null);
      return;
    }

    const storedOrgId = window.localStorage.getItem(ORG_STORAGE_KEY);
    const isStoredOrgAvailable = memberships.some((membership) => membership.id === storedOrgId);
    const nextOrgId = isStoredOrgAvailable ? storedOrgId : memberships[0].id;

    setCurrentOrgId(nextOrgId);
    if (nextOrgId) {
      window.localStorage.setItem(ORG_STORAGE_KEY, nextOrgId);
    }
  }, [memberships]);

  const value = useMemo<OrgContextValue>(() => {
    const currentOrg = memberships.find((membership) => membership.id === currentOrgId) ?? memberships[0] ?? null;

    return {
      currentOrg,
      memberships,
      setCurrentOrg: (organizationId: string) => {
        setCurrentOrgId(organizationId);
        window.localStorage.setItem(ORG_STORAGE_KEY, organizationId);
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
