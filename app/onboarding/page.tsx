import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
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
    <main className="bg-grid flex min-h-screen items-center justify-center px-6 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.2),transparent_26%)]" />
      <div className="relative z-10 w-full">
        <div className="mx-auto mb-8 max-w-lg text-center">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">SocietyOS setup</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">Create your first society workspace</h1>
          <p className="mt-3 text-base text-[var(--text-secondary)]">
            You&apos;re a few steps away from inviting your committee and landing in a fully seeded dashboard.
          </p>
        </div>
        <div className="mx-auto flex justify-center">
          <OnboardingWizard userId={user.id} userName={user.full_name} />
        </div>
      </div>
    </main>
  );
}
