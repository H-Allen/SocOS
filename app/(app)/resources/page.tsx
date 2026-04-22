import { redirect } from "next/navigation";

import { ResourcesWorkspace } from "@/components/resources/ResourcesWorkspace";
import { Navbar } from "@/components/layout/Navbar";
import { getServerActiveOrganization } from "@/lib/org-server";
import { getCurrentUser, getOrganizationResources, getUserMemberships } from "@/lib/supabase/queries";

export default async function ResourcesPage() {
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

  const resources = await getOrganizationResources(currentOrg.id);

  return (
    <div className="min-h-screen">
      <Navbar title="Resources" user={user} />
      <div className="bg-grid min-h-[calc(100vh-5rem)] px-6 py-6">
        <ResourcesWorkspace
          initialResources={resources}
          currentUser={user}
          orgId={currentOrg.id}
          permissionLevel={currentOrg.membership.permission_level}
        />
      </div>
    </div>
  );
}
