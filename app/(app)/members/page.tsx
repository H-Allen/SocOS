import { redirect } from "next/navigation";

import { Navbar } from "@/components/layout/Navbar";
import { MembersDirectory } from "@/components/members/MembersDirectory";
import { getServerActiveOrganization } from "@/lib/org-server";
import { getCurrentUser, getOrgMembers, getOrganizationTeams, getUserMemberships } from "@/lib/backend/queries";

export default async function MembersPage() {
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

  const [members, teams] = await Promise.all([
    getOrgMembers(currentOrg.id),
    getOrganizationTeams(currentOrg.id)
  ]);

  return (
    <div className="min-h-screen">
      <Navbar title="Members" user={user} />
      <div className="bg-grid min-h-[calc(100vh-5rem)] px-6 py-6">
        <MembersDirectory members={members} teams={teams} />
      </div>
    </div>
  );
}
