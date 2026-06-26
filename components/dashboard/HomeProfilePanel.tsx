"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, Settings, UserRound } from "lucide-react";

import { submitOnboardingItem } from "@/app/actions/onboarding-checklist";
import { updateProfile } from "@/app/actions/profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRoleLabel, getInitials, getRoleBadgeClasses } from "@/lib/workspace";
import type { MemberRecord, OnboardingItemRecord, OnboardingProgressRecord, OrganizationWithMembership, TeamRecord, UserRow } from "@/types";
import { cn } from "@/utils/cn";

type HomeProfilePanelProps = {
  user: UserRow;
  currentOrg: OrganizationWithMembership;
  currentMember: MemberRecord | null;
  team: TeamRecord | null;
  onboardingItems: OnboardingItemRecord[];
  onboardingProgress: OnboardingProgressRecord[];
};

export function HomeProfilePanel({ user, currentOrg, currentMember, team, onboardingItems, onboardingProgress }: HomeProfilePanelProps) {
  const [profile, setProfile] = useState(user);
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [progress, setProgress] = useState(onboardingProgress);
  const [error, setError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const visibleItems = onboardingItems.filter((item) => !item.team_id || item.team_id === currentMember?.team_id);
  const progressByItem = useMemo(() => new Map(progress.filter((entry) => entry.user_id === user.id).map((entry) => [entry.item_id, entry])), [progress, user.id]);
  const approved = visibleItems.filter((item) => progressByItem.get(item.id)?.status === "approved").length;
  const submitted = visibleItems.filter((item) => progressByItem.get(item.id)?.status === "submitted").length;

  const markDone = async (item: OnboardingItemRecord) => {
    setError(null);
    const result = await submitOnboardingItem({ organizationId: currentOrg.id, userId: user.id, itemId: item.id });
    if (result.error || !result.progress) {
      setError(result.error ?? "Could not update onboarding.");
    } else {
      setProgress((current) => {
        const exists = current.some((entry) => entry.id === result.progress?.id);
        return exists ? current.map((entry) => (entry.id === result.progress?.id ? result.progress! : entry)) : [...current, result.progress!];
      });
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    setError(null);
    const result = await updateProfile({ fullName, phone });
    if (result.error || !result.user) setError(result.error ?? "Could not update profile.");
    else setProfile(result.user);
    setSavingProfile(false);
  };

  return (
    <section className="space-y-6">
      <div className="surface-card rounded-[28px] p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border border-border">
              <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name ?? profile.email ?? "Profile"} />
              <AvatarFallback>{getInitials(profile.full_name, profile.email)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Your profile</p>
              <h2 className="mt-1 text-2xl font-semibold text-foreground">{profile.full_name ?? profile.email ?? "Your profile"}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {currentMember ? <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", getRoleBadgeClasses(currentMember.role))}>{formatRoleLabel(currentMember.role)}</span> : null}
                <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">{team?.name ?? "No team assigned"}</span>
              </div>
            </div>
          </div>
          <Link href="/teams" className="text-sm font-medium text-primary hover:text-[var(--accent-hover)]">Manage teams</Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <ProfileFact label="Email" value={profile.email ?? "No email"} />
          <ProfileFact label="Phone" value={profile.phone ?? "No phone added"} />
          <ProfileFact label="Society" value={currentOrg.name} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="rounded-[24px] border border-border bg-[var(--surface)] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Onboarding</p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">Complete your induction</h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Mark items done as you complete them. If something needs checking, your team head will approve it.
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{approved}/{visibleItems.length} approved</span>
          </div>
          <div className="mt-5 space-y-3">
            {visibleItems.length ? (
              visibleItems.map((item) => {
                const itemProgress = progressByItem.get(item.id);
                const isApproved = itemProgress?.status === "approved";
                const isSubmitted = itemProgress?.status === "submitted";
                return (
                  <div key={item.id} className="rounded-2xl border border-border bg-[var(--surface-2)] p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", isApproved ? "bg-emerald-100 text-emerald-700" : isSubmitted ? "bg-amber-100 text-amber-700" : "bg-[var(--surface)] text-[var(--text-muted)]")}>
                        {isApproved ? <CheckCircle2 className="h-5 w-5" /> : isSubmitted ? <Clock3 className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{item.title}</p>
                        {item.description ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.description}</p> : null}
                        <p className="mt-2 text-xs text-[var(--text-muted)]">{isApproved ? "Approved" : isSubmitted ? "Submitted, waiting for approval" : item.requires_approval ? "Needs approval after you mark it done" : "Self-completable"}</p>
                      </div>
                      {!isApproved ? (
                        <Button size="sm" variant={isSubmitted ? "outline" : "default"} onClick={() => void markDone(item)}>
                          {isSubmitted ? "Resubmit" : "Mark done"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-[var(--surface-2)] px-5 py-8 text-sm text-[var(--text-secondary)]">
                No onboarding checklist has been configured for you yet.
              </div>
            )}
          </div>
          {submitted ? <p className="mt-4 text-sm text-amber-600">{submitted} item{submitted === 1 ? "" : "s"} waiting for team head approval.</p> : null}
        </div>

        <div className="rounded-[24px] border border-border bg-[var(--surface)] p-6">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Profile settings</h3>
          </div>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Full name</label>
              <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Phone</label>
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Optional" />
            </div>
            {error ? <p className="text-sm font-medium text-red-500">{error}</p> : null}
            <Button onClick={() => void saveProfile()} disabled={savingProfile || !fullName.trim()}>{savingProfile ? "Saving..." : "Save profile"}</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProfileFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-[var(--surface-2)] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
