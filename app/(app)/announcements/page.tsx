import { redirect } from "next/navigation";

import { AnnouncementsWorkspace } from "@/components/announcements/AnnouncementsWorkspace";
import { Navbar } from "@/components/layout/Navbar";
import { getServerActiveOrganization } from "@/lib/org-server";
import { getCurrentUser, getOrganizationAnnouncements, getUserMemberships } from "@/lib/backend/queries";

export default async function AnnouncementsPage() {
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

  const announcements = await getOrganizationAnnouncements(currentOrg.id);

  return (
    <div className="min-h-screen">
      <Navbar title="Announcements" user={user} />
      <div className="bg-grid min-h-[calc(100vh-5rem)] px-6 py-6">
        <AnnouncementsWorkspace
          initialAnnouncements={announcements}
          currentUser={user}
          orgId={currentOrg.id}
          permissionLevel={currentOrg.membership.permission_level}
        />
      </div>
    </div>
  );
}
