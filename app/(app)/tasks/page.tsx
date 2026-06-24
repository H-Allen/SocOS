import { redirect } from "next/navigation";

import { Navbar } from "@/components/layout/Navbar";
import { TasksWorkspace } from "@/components/tasks/TasksWorkspace";
import { getServerActiveOrganization } from "@/lib/org-server";
import { getCurrentUser, getOrganizationTasks, getOrganizationTeams, getOrgMembers, getUserMemberships } from "@/lib/backend/queries";

export default async function TasksPage() {
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

  const [tasks, members, teams] = await Promise.all([
    getOrganizationTasks(currentOrg.id),
    getOrgMembers(currentOrg.id),
    getOrganizationTeams(currentOrg.id)
  ]);

  return (
    <div className="min-h-screen">
      <Navbar title="Tasks" user={user} />
      <div className="bg-grid min-h-[calc(100vh-5rem)] px-6 py-6">
        <div className="surface-card rounded-[28px] p-6">
          <TasksWorkspace initialTasks={tasks} members={members} teams={teams} currentUser={user} currentOrg={currentOrg} />
        </div>
      </div>
    </div>
  );
}
