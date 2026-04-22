import Link from "next/link";
import { ArrowRight, ShieldCheck, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-200/60 backdrop-blur">
          <p className="mb-4 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            SocietyOS
          </p>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Run your society like a real team, not a shared spreadsheet.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Centralise committee workflows, meetings, tasks, handovers, and member resources for every
            society in one secure workspace.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <Users className="h-5 w-5 text-slate-700" />
              <h2 className="mt-3 text-base font-semibold text-slate-900">Built for committees</h2>
              <p className="mt-1 text-sm text-slate-600">
                Delegate work, keep context, and avoid losing institutional memory every academic year.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <ShieldCheck className="h-5 w-5 text-slate-700" />
              <h2 className="mt-3 text-base font-semibold text-slate-900">Tenant-safe by default</h2>
              <p className="mt-1 text-sm text-slate-600">
                Supabase auth and row-level security keep each organization’s data isolated.
              </p>
            </div>
          </div>
        </section>

        <Card className="border-slate-200 bg-white/95 shadow-xl shadow-slate-200/60">
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
            <p className="text-sm text-slate-500">
              After authentication, users are redirected to their organization dashboard with session refresh
              handled in middleware.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
            >
              Preview dashboard shell
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
