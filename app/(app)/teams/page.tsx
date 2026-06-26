import { redirect } from "next/navigation";

import { Navbar } from "@/components/layout/Navbar";
import { TeamsWorkspace } from "@/components/teams/TeamsWorkspace";
import { getServerActiveOrganization } from "@/lib/org-server";
import { getCurrentUser, getOrgMembers, getOrganizationOnboarding, getOrganizationTasks, getOrganizationTeams, getUserMemberships } from "@/lib/backend/queries";

export default async function TeamsPage() {
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

  const [members, teams, tasks, onboarding] = await Promise.all([
    getOrgMembers(currentOrg.id),
    getOrganizationTeams(currentOrg.id),
    getOrganizationTasks(currentOrg.id),
    getOrganizationOnboarding(currentOrg.id)
  ]);

  return (
    <div className="min-h-screen">
      <Navbar title="Teams" user={user} />
      <div className="bg-grid min-h-[calc(100vh-5rem)] px-6 py-6">
        <TeamsWorkspace
          orgId={currentOrg.id}
          currentUserId={user.id}
          permissionLevel={currentOrg.membership.permission_level}
          initialMembers={members}
          initialTeams={teams}
          tasks={tasks}
          onboardingItems={onboarding.items}
          onboardingProgress={onboarding.progress}
        />
      </div>
    </div>
  );
}
