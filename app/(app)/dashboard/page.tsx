import { CalendarDays, FileText, Megaphone, Users } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const highlights = [
  {
    title: "Members",
    description: "View committee roles and track membership across every society workspace.",
    icon: Users
  },
  {
    title: "Meetings",
    description: "Capture agendas, decisions, and notes with a clear audit trail.",
    icon: CalendarDays
  },
  {
    title: "Resources",
    description: "Store handovers, links, files, and key operational knowledge in one place.",
    icon: FileText
  },
  {
    title: "Announcements",
    description: "Publish updates to members without losing important messages in group chats.",
    icon: Megaphone
  }
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-lg shadow-slate-200/50">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Dashboard</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Society operations, organised.</h1>
          <p className="mt-4 max-w-3xl text-slate-600">
            This starter dashboard is ready to be connected to organization-aware queries and role-based UI
            using the Supabase clients, SQL schema, and helper types included in this foundation.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {highlights.map(({ title, description, icon: Icon }) => (
            <Card key={title} className="border-slate-200 bg-white/95">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
                  <Icon className="h-5 w-5 text-slate-700" />
                </div>
                <CardTitle className="pt-4">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-slate-500">
                Hook this panel up to live organization data when the next feature slice lands.
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
