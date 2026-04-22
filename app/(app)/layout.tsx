import { redirect } from "next/navigation";

import { Sidebar } from "@/components/layout/Sidebar";
import { OrgProvider } from "@/lib/org-context";
import { getServerActiveOrganization } from "@/lib/org-server";
import { getCurrentUser, getUserMemberships } from "@/lib/supabase/queries";

export default async function AuthenticatedLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const memberships = await getUserMemberships();

  if (!memberships.length) {
    redirect("/onboarding");
  }

  const activeOrganization = getServerActiveOrganization(memberships);

  return (
    <OrgProvider memberships={memberships} initialOrgId={activeOrganization?.id}>
      <div className="grid min-h-screen grid-cols-[240px_minmax(0,1fr)] bg-background text-foreground">
        <div className="w-[240px]" />
        <Sidebar user={user} />
        <main className="min-h-screen">{children}</main>
      </div>
    </OrgProvider>
  );
}
