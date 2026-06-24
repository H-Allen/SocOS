import { redirect } from "next/navigation";

import { HandoverVaultIndex } from "@/components/handovers/HandoverVaultIndex";
import { Navbar } from "@/components/layout/Navbar";
import { getServerActiveOrganization } from "@/lib/org-server";
import { getCurrentUser, getOrganizationHandovers, getUserMemberships } from "@/lib/backend/queries";
import { roleHasCommitteeAccess } from "@/lib/workspace";

export default async function HandoversPage() {
  const [user, memberships] = await Promise.all([getCurrentUser(), getUserMemberships()]);

  if (!user) {
    redirect("/login");
  }

  if (!memberships.length) {
    redirect("/onboarding");
  }

  const currentOrg = getServerActiveOrganization(memberships);

  if (!currentOrg) {
    redirect("/onboarding");
  }

  const handovers = await getOrganizationHandovers(currentOrg.id);

  return (
    <div className="min-h-screen">
      <Navbar title="Handovers" user={user} />
      <div className="bg-grid min-h-[calc(100vh-5rem)] px-6 py-6">
        <HandoverVaultIndex
          organizationId={currentOrg.id}
          handovers={handovers}
          canEdit={roleHasCommitteeAccess(currentOrg.membership.permission_level)}
        />
      </div>
    </div>
  );
}
