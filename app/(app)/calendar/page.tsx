import { redirect } from "next/navigation";

import { CalendarWorkspace } from "@/components/calendar/CalendarWorkspace";
import { Navbar } from "@/components/layout/Navbar";
import { getServerActiveOrganization } from "@/lib/org-server";
import { getCurrentUser, getMeetingsByTime, getOrgMembers, getOrganizationEvents, getOrganizationTasks, getUserMemberships } from "@/lib/backend/queries";

export default async function CalendarPage() {
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

  const [meetingsByTime, tasks, events, members] = await Promise.all([
    getMeetingsByTime(currentOrg.id),
    getOrganizationTasks(currentOrg.id),
    getOrganizationEvents(currentOrg.id),
    getOrgMembers(currentOrg.id)
  ]);

  return (
    <div className="min-h-screen">
      <Navbar title="Calendar" user={user} />
      <div className="bg-grid min-h-[calc(100vh-5rem)] px-6 py-6">
        <CalendarWorkspace
          meetings={[...meetingsByTime.upcoming, ...meetingsByTime.past]}
          tasks={tasks}
          events={events}
          members={members}
          orgId={currentOrg.id}
          currentUserId={user.id}
          permissionLevel={currentOrg.membership.permission_level}
        />
      </div>
    </div>
  );
}
