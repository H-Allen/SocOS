import { redirect } from "next/navigation";

import { MeetingsWorkspace } from "@/components/meetings/MeetingsWorkspace";
import { Navbar } from "@/components/layout/Navbar";
import { getServerActiveOrganization } from "@/lib/org-server";
import { getCurrentUser, getMeetingsByTime, getOrgMembers, getUserMemberships } from "@/lib/backend/queries";

export default async function MeetingsPage() {
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

  const [{ upcoming, past }, members] = await Promise.all([getMeetingsByTime(currentOrg.id), getOrgMembers(currentOrg.id)]);

  return (
    <div className="min-h-screen">
      <Navbar title="Meetings" user={user} />
      <div className="bg-grid min-h-[calc(100vh-5rem)] px-6 py-6">
        <div className="surface-card rounded-[28px] p-6">
          <MeetingsWorkspace upcoming={upcoming} past={past} members={members} orgId={currentOrg.id} currentUserId={user.id} />
        </div>
      </div>
    </div>
  );
}
