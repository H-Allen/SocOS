"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BookOpenCheck, Plus, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  DEFAULT_HANDOVER_ROLES,
  getHandoverStatus,
  slugifyRole
} from "@/lib/handover";
import type { HandoverRow } from "@/types";
import { formatDate } from "@/utils/format";
import { cn } from "@/utils/cn";

const INFO_BANNER_KEY = "societyos.handoverVault.bannerDismissed";

type HandoverVaultIndexProps = {
  organizationId: string;
  handovers: HandoverRow[];
};

type CardRecord = {
  roleName: string;
  slug: string;
  completionPercent: number;
  status: string;
  updatedAt: string | null;
  isDefaultRole: boolean;
};

function cardStyles(status: string) {
  if (status === "Complete") {
    return "border-emerald-200/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.72),rgba(248,248,251,0.96))]";
  }

  if (status === "Empty") {
    return "border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.9),rgba(248,248,251,0.96))]";
  }

  return "border-border bg-[var(--surface)]";
}

export function HandoverVaultIndex({ organizationId, handovers }: HandoverVaultIndexProps) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const client = supabase as any;
  const [bannerVisible, setBannerVisible] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.localStorage.getItem(INFO_BANNER_KEY) !== "true";
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const cards = useMemo<CardRecord[]>(() => {
    const defaultRoleSet = new Set(DEFAULT_HANDOVER_ROLES);
    const mapped = new Map<string, CardRecord>();

    for (const handover of handovers) {
      const slug = slugifyRole(handover.role_name);
      mapped.set(slug, {
        roleName: handover.role_name,
        slug,
        completionPercent: handover.completion_percent ?? 0,
        status: getHandoverStatus(handover.completion_percent ?? 0),
        updatedAt: handover.updated_at,
        isDefaultRole: defaultRoleSet.has(handover.role_name as (typeof DEFAULT_HANDOVER_ROLES)[number])
      });
    }

    for (const role of DEFAULT_HANDOVER_ROLES) {
      const slug = slugifyRole(role);

      if (!mapped.has(slug)) {
        mapped.set(slug, {
          roleName: role,
          slug,
          completionPercent: 0,
          status: "Empty",
          updatedAt: null,
          isDefaultRole: true
        });
      }
    }

    return [...mapped.values()].sort((left, right) => {
      if (left.isDefaultRole !== right.isDefaultRole) {
        return left.isDefaultRole ? -1 : 1;
      }

      return left.roleName.localeCompare(right.roleName);
    });
  }, [handovers]);

  const completeCount = cards.filter((card) => card.status === "Complete").length;
  const needsAttentionCount = cards.filter((card) => card.status === "Empty").length;

  const dismissBanner = () => {
    setBannerVisible(false);
    window.localStorage.setItem(INFO_BANNER_KEY, "true");
  };

  const createCustomRole = async () => {
    const trimmedRole = roleName.trim();

    if (!trimmedRole) {
      return;
    }

    const slug = slugifyRole(trimmedRole);

    if (cards.some((card) => card.slug === slug)) {
      router.push(`/handovers/${slug}`);
      return;
    }

    setIsCreating(true);
    const { error } = await client
      .from("handovers")
      .insert({
        organization_id: organizationId,
        role_name: trimmedRole,
        responsibilities: null,
        annual_timeline: null,
        key_contacts: null,
        advice: null,
        mistakes: null,
        content: {},
        checklist: [],
        completion_percent: 0,
        updated_at: new Date().toISOString()
      })
      .select("id")
      .single();

    setIsCreating(false);

    if (error) {
      return;
    }

    setDialogOpen(false);
    setRoleName("");
    router.push(`/handovers/${slug}`);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <section className="surface-card overflow-hidden rounded-[28px]">
        <div className="flex flex-col gap-6 p-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Continuity</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">Handover Vault</h1>
            <p className="mt-3 max-w-2xl text-base text-[var(--text-secondary)]">
              Preserve institutional knowledge across leadership changes.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-[var(--surface)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Complete</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{completeCount}</p>
            </div>
            <div className="rounded-2xl border border-border bg-[var(--surface)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Needs Attention</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{needsAttentionCount}</p>
            </div>
          </div>
        </div>
      </section>

      {bannerVisible ? (
        <section className="surface-card rounded-[24px] border border-amber-200/80 bg-[linear-gradient(135deg,rgba(255,251,235,0.96),rgba(248,248,251,0.9))] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Every year, knowledge walks out the door. Fill these in now.</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Even rough notes here can save the next committee weeks of preventable confusion.
                </p>
              </div>
            </div>
            <Button variant="ghost" onClick={dismissBanner} className="self-start md:self-center">
              Dismiss
            </Button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const lastUpdatedLabel = card.completionPercent > 0 && card.updatedAt ? formatDate(card.updatedAt) : "Never updated";

          return (
            <Link
              key={card.slug}
              href={`/handovers/${card.slug}`}
              className={cn(
                "group rounded-xl border p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(17,17,24,0.08)]",
                cardStyles(card.status)
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{card.roleName}</h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {card.completionPercent > 0 ? `Last updated ${lastUpdatedLabel}` : lastUpdatedLabel}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                    card.status === "Complete" && "bg-emerald-100 text-emerald-700",
                    card.status === "In Progress" && "bg-sky-100 text-sky-700",
                    card.status === "Empty" && "bg-amber-100 text-amber-700"
                  )}
                >
                  {card.status}
                </span>
              </div>

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Completion</span>
                  <span className="font-semibold text-foreground">{card.completionPercent}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      card.status === "Complete" && "bg-emerald-500",
                      card.status === "In Progress" && "bg-sky-500",
                      card.status === "Empty" && "bg-amber-400"
                    )}
                    style={{ width: `${card.completionPercent}%` }}
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <BookOpenCheck className="h-4 w-4" />
                  {card.status === "Empty" ? "Needs attention" : "Open vault"}
                </div>
                <ArrowRight className="h-4 w-4 text-[var(--text-secondary)] transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="group rounded-xl border border-dashed border-border bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-6 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_18px_50px_rgba(17,17,24,0.08)]"
        >
          <div className="flex h-full flex-col justify-between gap-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Add custom role</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Create a handover vault for committee roles that are unique to your society.
              </p>
            </div>
          </div>
        </button>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add custom role</DialogTitle>
            <DialogDescription>Create a dedicated handover vault for a role your society relies on.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-6 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="role-name">
                Role name
              </label>
              <Input
                id="role-name"
                placeholder="For example: Welfare Lead"
                value={roleName}
                onChange={(event) => setRoleName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void createCustomRole();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void createCustomRole()} disabled={!roleName.trim() || isCreating}>
                {isCreating ? "Creating..." : "Create role"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
