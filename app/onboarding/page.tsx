import Link from "next/link";
import { Rocket } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, getUserMemberships } from "@/lib/supabase/queries";

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const memberships = await getUserMemberships();

  if (memberships.length) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-2xl bg-[var(--surface)]">
        <CardHeader className="items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/15 text-primary">
            <Rocket className="h-8 w-8" />
          </div>
          <CardTitle className="text-3xl">Welcome to SocietyOS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-center">
          <p>
            Your account is ready, but you are not a member of any organization yet. The next step is to add an
            organization creation or invitation flow so users can join their society workspace.
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Right now this page confirms the authenticated shell is working and safely prevents access to org-scoped
            routes until memberships exist.
          </p>
          <div className="flex justify-center">
            <Button asChild>
              <Link href="/login">Back to login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
