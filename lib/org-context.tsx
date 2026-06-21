"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { setActiveOrg } from "@/app/actions/set-active-org";
import { ACTIVE_ORG_STORAGE_KEY, resolveActiveOrganization } from "@/lib/org-state";
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

export function OrgProvider({ memberships, initialOrgId, children }: OrgProviderProps) {
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(initialOrgId ?? memberships[0]?.id ?? null);
  const [, startTransition] = useTransition();
  const lastPersistedOrgIdRef = useRef<string | null>(initialOrgId ?? null);
  const membershipIds = useMemo(() => memberships.map((membership) => membership.id).join("|"), [memberships]);

  useEffect(() => {
    if (!memberships.length) {
      setCurrentOrgId(null);
      return;
    }

    const storedOrgId = window.localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
    const nextOrgId = resolveActiveOrganization(memberships, storedOrgId ?? initialOrgId)?.id ?? memberships[0].id;

    setCurrentOrgId(nextOrgId);

    if (nextOrgId) {
      // Keep localStorage as a client-side hint for immediate UI updates
      window.localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, nextOrgId);

      if (nextOrgId !== initialOrgId && nextOrgId !== lastPersistedOrgIdRef.current) {
        lastPersistedOrgIdRef.current = nextOrgId;
        startTransition(() => {
          setActiveOrg(nextOrgId);
        });
      }
    }
  }, [initialOrgId, membershipIds, memberships]);

  const value = useMemo<OrgContextValue>(() => {
    const currentOrg = resolveActiveOrganization(memberships, currentOrgId);

    return {
      currentOrg,
      memberships,
      setCurrentOrg: (organizationId: string) => {
        setCurrentOrgId(organizationId);
        // Update client-side hint immediately for snappy UI
        window.localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, organizationId);

        if (organizationId !== lastPersistedOrgIdRef.current) {
          lastPersistedOrgIdRef.current = organizationId;
          startTransition(() => {
            setActiveOrg(organizationId);
          });
        }
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
