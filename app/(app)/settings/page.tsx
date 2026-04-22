import { redirect } from "next/navigation";

import { Navbar } from "@/components/layout/Navbar";
import { SettingsWorkspace } from "@/components/settings/SettingsWorkspace";
import { getServerActiveOrganization } from "@/lib/org-server";
import { getCurrentUser, getOrganization, getOrganizationRoles, getUserMemberships } from "@/lib/supabase/queries";

export default async function SettingsPage() {
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

  const [organization, roles] = await Promise.all([getOrganization(currentOrg.id), getOrganizationRoles(currentOrg.id)]);

  if (!organization) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen">
      <Navbar title="Settings" user={user} />
      <div className="bg-grid min-h-[calc(100vh-5rem)] px-6 py-6">
        <SettingsWorkspace organization={organization} initialRoles={roles} permissionLevel={currentOrg.membership.permission_level} />
      </div>
    </div>
  );
}
