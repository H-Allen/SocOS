import { redirect } from "next/navigation";

import { Navbar } from "@/components/layout/Navbar";
import { MembersWorkspace } from "@/components/members/MembersWorkspace";
import { getServerActiveOrganization } from "@/lib/org-server";
import { getCurrentUser, getOrgMembers, getOrganizationTasks, getUserMemberships } from "@/lib/backend/queries";

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

  const [members, tasks] = await Promise.all([getOrgMembers(currentOrg.id), getOrganizationTasks(currentOrg.id)]);

  return (
    <div className="min-h-screen">
      <Navbar title="Members" user={user} />
      <div className="bg-grid min-h-[calc(100vh-5rem)] px-6 py-6">
        <MembersWorkspace
          initialMembers={members}
          tasks={tasks}
          orgId={currentOrg.id}
          currentUserId={user.id}
          permissionLevel={currentOrg.membership.permission_level}
        />
      </div>
    </div>
  );
}
