import { notFound, redirect } from "next/navigation";

import { MeetingDetailClient } from "@/components/meetings/MeetingDetailClient";
import { Navbar } from "@/components/layout/Navbar";
import { getCurrentUser, getMeetingActionItems, getMeetingDetails, getOrgMembers, getUserMemberships } from "@/lib/supabase/queries";

export default async function MeetingDetailPage({
  params
}: {
  params: {
    id: string;
  };
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const meeting = await getMeetingDetails(params.id);

  if (!meeting) {
    notFound();
  }

  const memberships = await getUserMemberships();
  const currentOrg = memberships.find((membership) => membership.id === meeting.organization_id);

  if (!currentOrg) {
    redirect("/meetings");
  }

  const [members, actionItems] = await Promise.all([getOrgMembers(meeting.organization_id), getMeetingActionItems(meeting.id)]);

  return (
    <div className="min-h-screen">
      <Navbar title={meeting.title} user={user} />
      <div className="bg-grid min-h-[calc(100vh-5rem)] px-6 py-6">
        <div className="surface-card rounded-[28px] p-6">
          <MeetingDetailClient meeting={meeting} members={members} actionItems={actionItems} currentUserId={user.id} orgId={meeting.organization_id} />
        </div>
      </div>
    </div>
  );
}
