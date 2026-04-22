import { Settings } from "lucide-react";

import { AppPage } from "@/components/layout/AppPage";

export default function SettingsPage() {
  return <AppPage title="Settings" icon={Settings} description="Manage account preferences, workspace settings, and future organization-level configuration." />;
}
