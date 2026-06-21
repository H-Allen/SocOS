import type { LucideIcon } from "lucide-react";

import { getCurrentUser } from "@/lib/backend/queries";
import { Navbar } from "@/components/layout/Navbar";
import { EmptyState } from "@/components/ui/EmptyState";

type AppPageProps = {
  title: string;
  icon: LucideIcon;
  description: string;
};

export async function AppPage({ title, icon, description }: AppPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Navbar title={title} user={user} />
      <div className="bg-grid min-h-[calc(100vh-5rem)] px-6 py-6">
        <div className="surface-card min-h-[calc(100vh-8rem)] rounded-[28px]">
          <EmptyState icon={icon} title={title} description={description} />
        </div>
      </div>
    </div>
  );
}
