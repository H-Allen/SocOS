"use client";

import { useMemo, useState } from "react";
import { Mail, Phone, Users2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatRoleLabel, getInitials, getRoleBadgeClasses } from "@/lib/workspace";
import type { MemberRecord, TeamRecord } from "@/types";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/format";

type MembersDirectoryProps = {
  members: MemberRecord[];
  teams: TeamRecord[];
};

export function MembersDirectory({ members, teams }: MembersDirectoryProps) {
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);
  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const filtered = members.filter((member) => {
    const value = `${member.user?.full_name ?? ""} ${member.user?.email ?? ""} ${member.user?.phone ?? ""} ${member.role} ${member.team_id ? teamById.get(member.team_id)?.name ?? "" : ""}`.toLowerCase();
    return value.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <section className="surface-card rounded-[28px] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Directory</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">Members</h1>
        <p className="mt-3 max-w-2xl text-base text-[var(--text-secondary)]">
          A clean directory of everyone in the society. Team and role management now lives in Teams and Settings.
        </p>
      </section>

      <section className="rounded-[24px] border border-border bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-4">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search members by name, email, role, phone, or team" />
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((member) => {
          const team = member.team_id ? teamById.get(member.team_id) : null;
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => setSelectedMember(member)}
              className="rounded-2xl border border-border bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(17,17,24,0.08)]"
            >
              <div className="flex items-center justify-between gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={member.user?.avatar_url ?? undefined} alt={member.user?.full_name ?? member.user?.email ?? "Member"} />
                  <AvatarFallback>{getInitials(member.user?.full_name ?? null, member.user?.email ?? null)}</AvatarFallback>
                </Avatar>
                <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", getRoleBadgeClasses(member.role))}>
                  {formatRoleLabel(member.role)}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-foreground">{member.user?.full_name ?? member.user?.email ?? "Unknown member"}</h2>
              <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">{member.user?.email ?? "No email"}</p>
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                <Users2 className="h-4 w-4" />
                {team?.name ?? "No team assigned"}
              </div>
            </button>
          );
        })}
      </section>

      <Sheet open={Boolean(selectedMember)} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <SheetContent className="overflow-y-auto">
          {selectedMember ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedMember.user?.full_name ?? selectedMember.user?.email ?? "Member profile"}</SheetTitle>
                <SheetDescription>Role, team, and contact information.</SheetDescription>
              </SheetHeader>
              <div className="space-y-6 p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedMember.user?.avatar_url ?? undefined} alt={selectedMember.user?.full_name ?? selectedMember.user?.email ?? "Member"} />
                    <AvatarFallback>{getInitials(selectedMember.user?.full_name ?? null, selectedMember.user?.email ?? null)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-lg font-semibold text-foreground">{selectedMember.user?.full_name ?? "Unnamed member"}</p>
                    <span className={cn("mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold", getRoleBadgeClasses(selectedMember.role))}>
                      {formatRoleLabel(selectedMember.role)}
                    </span>
                  </div>
                </div>
                <InfoRow icon={Users2} label="Team" value={selectedMember.team_id ? teamById.get(selectedMember.team_id)?.name ?? "Unknown team" : "No team assigned"} />
                <InfoRow icon={Mail} label="Email" value={selectedMember.user?.email ?? "No email"} />
                <InfoRow icon={Phone} label="Phone" value={selectedMember.user?.phone ?? "No phone added"} />
                <div className="rounded-2xl border border-border bg-[var(--surface-2)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Joined</p>
                  <p className="mt-2 text-sm text-foreground">{formatDate(selectedMember.joined_at)}</p>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-[var(--surface-2)] p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface)] text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
        <p className="mt-1 truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
