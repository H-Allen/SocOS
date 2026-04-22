import { CheckSquare } from "lucide-react";

import { AppPage } from "@/components/layout/AppPage";

export default function TasksPage() {
  return <AppPage title="Tasks" icon={CheckSquare} description="Track committee work, ownership, and deadlines for your active organization." />;
}
