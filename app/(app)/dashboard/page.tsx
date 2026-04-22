import { LayoutDashboard } from "lucide-react";

import { AppPage } from "@/components/layout/AppPage";

export default function DashboardPage() {
  return <AppPage title="Dashboard" icon={LayoutDashboard} description="Your organization dashboard will surface activity, priorities, and upcoming work in one clear operating view." />;
}
