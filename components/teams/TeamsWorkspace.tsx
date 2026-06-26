"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, Plus, Shield, Users2 } from "lucide-react";

import { createTeam as createTeamAction, updateMemberTeam, updateTeam as updateTeamAction } from "@/app/actions/members";
import { approveOnboardingItem, createOnboardingItem, deleteOnboardingItem, submitOnboardingItem } from "@/app/actions/onboarding-checklist";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatRoleLabel, getInitials, getRoleBadgeClasses, permissionForRole } from "@/lib/workspace";
import type { MemberRecord, OnboardingItemRecord, OnboardingProgressRecord, PermissionLevel, TaskRecord, TeamRecord } from "@/types";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/format";

type TeamsWorkspaceProps = {
  orgId: string;
  currentUserId: string;
  permissionLevel: PermissionLevel;
  initialMembers: MemberRecord[];
  initialTeams: TeamRecord[];
  tasks: TaskRecord[];
  onboardingItems: OnboardingItemRecord[];
  onboardingProgress: OnboardingProgressRecord[];
};

type TeamForm = {
  name: string;
  leadUserId: string;
};

type ItemForm = {
  title: string;
  description: string;
  required: boolean;
  requiresApproval: boolean;
};

const EMPTY_ITEM: ItemForm = {
  title: "",
  description: "",
  required: true,
  requiresApproval: true
};

export function TeamsWorkspace({
  orgId,
  currentUserId,
  permissionLevel,
  initialMembers,
  initialTeams,
  tasks,
  onboardingItems: initialItems,
  onboardingProgress: initialProgress
}: TeamsWorkspaceProps) {
  const [teams, setTeams] = useState(initialTeams);
  const [members, setMembers] = useState(initialMembers);
  const [onboardingItems, setOnboardingItems] = useState(initialItems);
  const [onboardingProgress, setOnboardingProgress] = useState(initialProgress);
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeams[0]?.id ?? "");
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [teamForm, setTeamForm] = useState<TeamForm>({ name: "", leadUserId: currentUserId });
  const [itemForm, setItemForm] = useState<ItemForm>(EMPTY_ITEM);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canAdmin = permissionLevel === "admin";
  const canManageTeams = permissionLevel === "admin" || permissionLevel === "committee";
  const eligibleLeads = members.filter((member) => permissionForRole(member.role) !== "member");
  const visibleTeams = canAdmin ? teams : teams.filter((team) => team.lead_user_id === currentUserId || members.some((member) => member.user_id === currentUserId && member.team_id === team.id));
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? visibleTeams[0] ?? null;
  const teamMembers = selectedTeam ? members.filter((member) => member.team_id === selectedTeam.id) : [];
  const unassignedMembers = members.filter((member) => member.role === "member" && !member.team_id);
  const manageable = Boolean(selectedTeam && (canAdmin || selectedTeam.lead_user_id === currentUserId));
  const progressByMemberAndItem = useMemo(() => {
    const map = new Map<string, OnboardingProgressRecord>();
    onboardingProgress.forEach((entry) => map.set(`${entry.user_id}_${entry.item_id}`, entry));
    return map;
  }, [onboardingProgress]);

  const teamItems = selectedTeam ? onboardingItems.filter((item) => !item.team_id || item.team_id === selectedTeam.id) : [];
  const selectedTeamSpecificItems = selectedTeam ? onboardingItems.filter((item) => item.team_id === selectedTeam.id) : [];
  const teamTasks = selectedTeam ? tasks.filter((task) => task.team_id === selectedTeam.id) : [];

  const summaryFor = (member: MemberRecord) => {
    const required = teamItems.filter((item) => item.required);
    const tracked = required.length ? required : teamItems;
    const approved = tracked.filter((item) => progressByMemberAndItem.get(`${member.user_id}_${item.id}`)?.status === "approved").length;
    const submitted = tracked.filter((item) => progressByMemberAndItem.get(`${member.user_id}_${item.id}`)?.status === "submitted").length;
    const touched = tracked.filter((item) => progressByMemberAndItem.has(`${member.user_id}_${item.id}`)).length;
    const total = tracked.length;
    return {
      total,
      approved,
      submitted,
      status: total === 0 ? "not_configured" : approved === total ? "complete" : touched === 0 ? "not_started" : "partial"
    };
  };

  const createTeam = async () => {
    setError(null);
    setIsSaving(true);
    const result = await createTeamAction({
      organizationId: orgId,
      name: teamForm.name,
      leadUserId: teamForm.leadUserId
    });

    if (result.error || !result.team) {
      setError(result.error ?? "Could not create team.");
    } else {
      const lead = members.find((member) => member.user_id === result.team?.lead_user_id)?.user ?? null;
      setTeams((current) => [...current, { ...result.team!, lead }]);
      setSelectedTeamId(result.team.id);
      setTeamForm({ name: "", leadUserId: currentUserId });
      setTeamDialogOpen(false);
    }

    setIsSaving(false);
  };

  const updateTeam = async () => {
    if (!selectedTeam) return;
    setError(null);
    setIsSaving(true);
    const result = await updateTeamAction({
      organizationId: orgId,
      teamId: selectedTeam.id,
      name: selectedTeam.name,
      leadUserId: selectedTeam.lead_user_id
    });

    if (result.error) {
      setError(result.error);
    }

    setIsSaving(false);
  };

  const assignMember = async (member: MemberRecord, teamId: string | null) => {
    setError(null);
    const result = await updateMemberTeam({ organizationId: orgId, membershipId: member.id, teamId });
    if (result.error) {
      setError(result.error);
    } else {
      const nextTeam = teamId ? teams.find((team) => team.id === teamId) : null;
      setMembers((current) =>
        current.map((entry) => (entry.id === member.id ? { ...entry, team_id: teamId, team_lead_user_id: nextTeam?.lead_user_id ?? null } : entry))
      );
    }
  };

  const createItem = async () => {
    if (!selectedTeam) return;
    setError(null);
    setIsSaving(true);
    const result = await createOnboardingItem({
      organizationId: orgId,
      teamId: selectedTeam.id,
      title: itemForm.title,
      description: itemForm.description,
      required: itemForm.required,
      requiresApproval: itemForm.requiresApproval
    });

    if (result.error || !result.item) {
      setError(result.error ?? "Could not add induction item.");
    } else {
      setOnboardingItems((current) => [...current, result.item!]);
      setItemForm(EMPTY_ITEM);
      setItemDialogOpen(false);
    }

    setIsSaving(false);
  };

  const deleteItem = async (itemId: string) => {
    const result = await deleteOnboardingItem({ organizationId: orgId, itemId });
    if (result.error) {
      setError(result.error);
    } else {
      setOnboardingItems((current) => current.filter((item) => item.id !== itemId));
      setOnboardingProgress((current) => current.filter((entry) => entry.item_id !== itemId));
    }
  };

  const upsertProgress = (progress: OnboardingProgressRecord) => {
    setOnboardingProgress((current) => {
      const exists = current.some((entry) => entry.id === progress.id);
      return exists ? current.map((entry) => (entry.id === progress.id ? progress : entry)) : [...current, progress];
    });
  };

  const submitItem = async (member: MemberRecord, item: OnboardingItemRecord) => {
    const result = await submitOnboardingItem({ organizationId: orgId, userId: member.user_id, itemId: item.id });
    if (result.error || !result.progress) setError(result.error ?? "Could not update induction.");
    else upsertProgress(result.progress);
  };

  const approveItem = async (member: MemberRecord, item: OnboardingItemRecord) => {
    const result = await approveOnboardingItem({ organizationId: orgId, userId: member.user_id, itemId: item.id });
    if (result.error || !result.progress) setError(result.error ?? "Could not approve induction item.");
    else upsertProgress(result.progress);
  };

  return (
    <div className="space-y-6">
      <section className="surface-card rounded-[28px] p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Team cockpit</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">Teams</h1>
            <p className="mt-3 max-w-3xl text-base text-[var(--text-secondary)]">
              Run team membership, heads, team tasks, and team-specific induction from one place.
            </p>
          </div>
          {canManageTeams ? (
            <Button onClick={() => setTeamDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Create team
            </Button>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3">
          {visibleTeams.length ? (
            visibleTeams.map((team) => {
              const count = members.filter((member) => member.team_id === team.id).length;
              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => setSelectedTeamId(team.id)}
                  className={cn(
                    "w-full rounded-2xl border p-4 text-left transition-all",
                    selectedTeam?.id === team.id ? "border-primary bg-primary/10" : "border-border bg-[var(--surface)] hover:bg-[var(--surface-2)]"
                  )}
                >
                  <p className="font-semibold text-foreground">{team.name}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{count} members</p>
                  <p className="mt-3 text-xs text-[var(--text-muted)]">Lead: {team.lead?.full_name ?? team.lead?.email ?? "Unknown"}</p>
                </button>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-[var(--surface)] p-5 text-sm text-[var(--text-secondary)]">
              No teams to show yet.
            </div>
          )}
        </aside>

        {selectedTeam ? (
          <main className="space-y-5">
            {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}

            <section className="rounded-[24px] border border-border bg-[var(--surface)] p-5">
              <div className="grid gap-4 lg:grid-cols-[1fr_240px_auto]">
                <Input
                  disabled={!manageable}
                  value={selectedTeam.name}
                  onChange={(event) => setTeams((current) => current.map((team) => (team.id === selectedTeam.id ? { ...team, name: event.target.value } : team)))}
                />
                <select
                  disabled={!canAdmin}
                  value={selectedTeam.lead_user_id}
                  onChange={(event) =>
                    setTeams((current) =>
                      current.map((team) =>
                        team.id === selectedTeam.id
                          ? { ...team, lead_user_id: event.target.value, lead: members.find((member) => member.user_id === event.target.value)?.user ?? null }
                          : team
                      )
                    )
                  }
                  className="flex h-10 rounded-lg border border-border bg-[var(--surface)] px-3 text-sm"
                >
                  {eligibleLeads.map((member) => (
                    <option key={member.id} value={member.user_id}>
                      {member.user?.full_name ?? member.user?.email ?? formatRoleLabel(member.role)}
                    </option>
                  ))}
                </select>
                {manageable ? (
                  <Button onClick={() => void updateTeam()} disabled={isSaving}>
                    Save team
                  </Button>
                ) : null}
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <Metric label="Members" value={String(teamMembers.length)} />
                <Metric label="Open tasks" value={String(teamTasks.filter((task) => task.status !== "done").length)} />
                <Metric label="Fully inducted" value={String(teamMembers.filter((member) => summaryFor(member).status === "complete").length)} />
                <Metric label="Needs approval" value={String(teamMembers.filter((member) => summaryFor(member).submitted > 0).length)} />
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <div className="rounded-[24px] border border-border bg-[var(--surface)] p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Members</h2>
                  <Users2 className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-4 space-y-3">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="space-y-2">
                      <MemberRow member={member} summary={summaryFor(member)} />
                      {manageable && member.role === "member" ? (
                        <div className="flex justify-end">
                          <Button size="sm" variant="ghost" onClick={() => void assignMember(member, null)}>
                            Remove from team
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {manageable && unassignedMembers.length ? (
                    <div className="mt-5 rounded-2xl border border-dashed border-border bg-[var(--surface-2)] p-4">
                      <p className="text-sm font-semibold text-foreground">Add member to team</p>
                      <select
                        className="mt-3 flex h-10 w-full rounded-lg border border-border bg-[var(--surface)] px-3 text-sm"
                        defaultValue=""
                        onChange={(event) => {
                          const member = members.find((entry) => entry.id === event.target.value);
                          if (member) void assignMember(member, selectedTeam.id);
                          event.currentTarget.value = "";
                        }}
                      >
                        <option value="">Choose unassigned member</option>
                        {unassignedMembers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.user?.full_name ?? member.user?.email ?? "Unknown member"}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[24px] border border-border bg-[var(--surface)] p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Team tasks</h2>
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-4 space-y-3">
                  {teamTasks.length ? (
                    teamTasks.slice(0, 8).map((task) => (
                      <div key={task.id} className="rounded-2xl border border-border bg-[var(--surface-2)] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{task.title}</p>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">{task.assignee?.full_name ?? task.assignee?.email ?? "Unassigned"}</p>
                          </div>
                          <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">{task.status?.replace("_", " ") ?? "todo"}</span>
                        </div>
                        <p className="mt-2 text-xs text-[var(--text-muted)]">{task.due_date ? `Due ${formatDate(task.due_date)}` : "No due date"}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border bg-[var(--surface-2)] p-5 text-sm text-[var(--text-secondary)]">
                      No team tasks yet. Create team tasks from the Tasks page.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-border bg-[var(--surface)] p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Team induction</h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">Team-specific checks sit alongside the society-wide onboarding checklist.</p>
                </div>
                {manageable ? (
                  <Button variant="outline" onClick={() => setItemDialogOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Add team item
                  </Button>
                ) : null}
              </div>
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {teamMembers.map((member) => (
                  <div key={member.id} className="rounded-2xl border border-border bg-[var(--surface-2)] p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground">{member.user?.full_name ?? member.user?.email ?? "Member"}</p>
                      <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                        {summaryFor(member).approved}/{summaryFor(member).total}
                      </span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {teamItems.map((item) => {
                        const progress = progressByMemberAndItem.get(`${member.user_id}_${item.id}`);
                        const isApproved = progress?.status === "approved";
                        const isSubmitted = progress?.status === "submitted";
                        return (
                          <div key={item.id} className="rounded-xl border border-border bg-[var(--surface)] p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-foreground">{item.title}</p>
                                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                  {isApproved ? "Approved" : isSubmitted ? "Submitted for approval" : "Not started"}
                                </p>
                              </div>
                              {isApproved ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : isSubmitted ? <Clock3 className="h-4 w-4 text-amber-600" /> : null}
                            </div>
                            {manageable ? (
                              <div className="mt-3 flex justify-end gap-2">
                                {!isApproved ? (
                                  <Button size="sm" variant="outline" onClick={() => void submitItem(member, item)}>
                                    Mark done
                                  </Button>
                                ) : null}
                                {!isApproved ? (
                                  <Button size="sm" onClick={() => void approveItem(member, item)}>
                                    Approve
                                  </Button>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {manageable && selectedTeamSpecificItems.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {selectedTeamSpecificItems.map((item) => (
                    <Button key={item.id} size="sm" variant="ghost" onClick={() => void deleteItem(item.id)}>
                      Delete {item.title}
                    </Button>
                  ))}
                </div>
              ) : null}
            </section>
          </main>
        ) : (
          <main className="rounded-[24px] border border-dashed border-border bg-[var(--surface)] p-10 text-center text-[var(--text-secondary)]">
            Create a team to unlock the cockpit.
          </main>
        )}
      </section>

      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create team</DialogTitle>
            <DialogDescription>Add a committee-led team to the society structure.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-6 pt-2">
            <Input value={teamForm.name} onChange={(event) => setTeamForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Sponsorship Team" />
            {canAdmin ? (
              <select value={teamForm.leadUserId} onChange={(event) => setTeamForm((current) => ({ ...current, leadUserId: event.target.value }))} className="flex h-10 w-full rounded-lg border border-border bg-[var(--surface)] px-3 text-sm">
                {eligibleLeads.map((member) => (
                  <option key={member.id} value={member.user_id}>
                    {member.user?.full_name ?? member.user?.email ?? formatRoleLabel(member.role)}
                  </option>
                ))}
              </select>
            ) : null}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setTeamDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => void createTeam()} disabled={isSaving || !teamForm.name.trim()}>{isSaving ? "Creating..." : "Create team"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add team induction item</DialogTitle>
            <DialogDescription>This item applies only to {selectedTeam?.name ?? "this team"}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-6 pt-2">
            <Input value={itemForm.title} onChange={(event) => setItemForm((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. Join GitHub organisation" />
            <Textarea value={itemForm.description} onChange={(event) => setItemForm((current) => ({ ...current, description: event.target.value }))} placeholder="Add instructions or acceptance criteria." />
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={itemForm.required} onChange={(event) => setItemForm((current) => ({ ...current, required: event.target.checked }))} /> Required</label>
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={itemForm.requiresApproval} onChange={(event) => setItemForm((current) => ({ ...current, requiresApproval: event.target.checked }))} /> Requires approval</label>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setItemDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => void createItem()} disabled={isSaving || !itemForm.title.trim()}>{isSaving ? "Adding..." : "Add item"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-[var(--surface-2)] px-4 py-3">
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
    </div>
  );
}

function MemberRow({ member, summary }: { member: MemberRecord; summary: { total: number; approved: number; submitted: number; status: string } }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-[var(--surface-2)] p-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.user?.avatar_url ?? undefined} alt={member.user?.full_name ?? member.user?.email ?? "Member"} />
          <AvatarFallback>{getInitials(member.user?.full_name ?? null, member.user?.email ?? null)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{member.user?.full_name ?? member.user?.email ?? "Unknown member"}</p>
          <span className={cn("mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", getRoleBadgeClasses(member.role))}>{formatRoleLabel(member.role)}</span>
        </div>
      </div>
      <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", summary.status === "complete" ? "bg-emerald-100 text-emerald-700" : summary.status === "partial" ? "bg-amber-100 text-amber-700" : "bg-[var(--surface)] text-[var(--text-secondary)]")}>
        {summary.status === "complete" ? "Inducted" : `${summary.approved}/${summary.total}`}
      </span>
    </div>
  );
}
