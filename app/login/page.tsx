import Link from "next/link";
import { ArrowRight, ShieldCheck, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="bg-grid flex min-h-screen items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[28px] border border-border bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-8 shadow-2xl shadow-black/20 backdrop-blur">
          <p className="mb-4 inline-flex items-center rounded-full border border-border bg-[var(--surface-2)] px-3 py-1 text-sm font-medium text-[var(--text-secondary)]">
            SocietyOS
          </p>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Run your society like a real team, not a shared spreadsheet.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--text-secondary)]">
            Centralise committee workflows, meetings, tasks, handovers, and member resources for every
            society in one secure workspace.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-[var(--surface-2)] p-5">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="mt-3 text-base font-semibold">Built for committees</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Delegate work, keep context, and avoid losing institutional memory every academic year.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-[var(--surface-2)] p-5">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="mt-3 text-base font-semibold">Tenant-safe by default</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Supabase auth and row-level security keep each organization’s data isolated.
              </p>
            </div>
          </div>
        </section>

        <Card className="bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] shadow-2xl shadow-black/20">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Connect this page to Supabase auth providers once your project keys are configured.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full justify-between">
              Continue with Supabase Auth
              <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="text-sm text-[var(--text-secondary)]">
              After authentication, users are redirected to their organization dashboard with session refresh
              handled in middleware.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-border bg-[var(--surface)] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[var(--surface-2)]"
            >
              Preview dashboard shell
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
