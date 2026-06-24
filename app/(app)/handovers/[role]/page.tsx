import { redirect } from "next/navigation";

import { HandoverDetailClient } from "@/components/handovers/HandoverDetailClient";
import { Navbar } from "@/components/layout/Navbar";
import { getServerActiveOrganization } from "@/lib/org-server";
import { slugifyRole } from "@/lib/handover";
import { getCurrentUser, getOrganizationHandovers, getUserMemberships } from "@/lib/backend/queries";
import { roleHasCommitteeAccess } from "@/lib/workspace";

export default async function HandoverDetailPage({
  params
}: {
  params: {
    role: string;
  };
}) {
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
  const handover = handovers.find((entry) => slugifyRole(entry.role_name) === params.role) ?? null;

  return (
    <div className="min-h-screen">
      <Navbar title="Handover Vault" user={user} />
      <div className="bg-grid min-h-[calc(100vh-5rem)] px-6 py-6">
        <HandoverDetailClient
          organizationId={currentOrg.id}
          roleSlug={params.role}
          initialHandover={handover}
          canEdit={roleHasCommitteeAccess(currentOrg.membership.permission_level)}
        />
      </div>
    </div>
  );
}
