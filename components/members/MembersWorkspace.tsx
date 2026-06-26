"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, LogOut, Plus, Shield, Trash2, UserCheck, UserPlus, Users2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createTeam as createTeamAction, inviteMember as inviteMemberAction, leaveOrganization, removeMember as removeMemberAction, updateMemberRole, updateMemberTeam } from "@/app/actions/members";
import { approveOnboardingItem, createOnboardingItem, deleteOnboardingItem, submitOnboardingItem } from "@/app/actions/onboarding-checklist";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { createBrowserBackendClient } from "@/lib/backend/client";
import { ACTIVE_ORG_STORAGE_KEY } from "@/lib/org-state";
import { canChangeRoles, formatRoleLabel, getInitials, getRoleBadgeClasses, permissionForRole, SOCIETY_ROLE_OPTIONS } from "@/lib/workspace";
import type { ActivityLogWithActor, MemberRecord, MembershipRole, OnboardingItemRecord, OnboardingProgressRecord, PermissionLevel, TaskRecord, TeamRecord } from "@/types";
import { formatDate, formatRelativeTime } from "@/utils/format";
import { cn } from "@/utils/cn";

type MembersWorkspaceProps = {
  initialMembers: MemberRecord[];
  tasks: TaskRecord[];
  teams: TeamRecord[];
  onboardingItems: OnboardingItemRecord[];
  onboardingProgress: OnboardingProgressRecord[];
  orgId: string;
  currentUserId: string;
  permissionLevel: PermissionLevel;
};

type InviteForm = {
  email: string;
  role: MembershipRole;
};

const EMPTY_INVITE: InviteForm = {
  email: "",
  role: "member"
};

type OnboardingForm = {
  title: string;
  description: string;
  required: boolean;
  requiresApproval: boolean;
};

const EMPTY_ONBOARDING_FORM: OnboardingForm = {
  title: "",
  description: "",
  required: true,
  requiresApproval: true
};

export function MembersWorkspace({
  initialMembers,
  tasks,
  teams: initialTeams,
  onboardingItems: initialOnboardingItems,
  onboardingProgress: initialOnboardingProgress,
  orgId,
  currentUserId,
  permissionLevel
}: MembersWorkspaceProps) {
  const router = useRouter();
  const backend = useMemo(() => createBrowserBackendClient(), []);
  const client = backend as any;
  const [members, setMembers] = useState(initialMembers);
  const [teams, setTeams] = useState(initialTeams);
  const [onboardingItems, setOnboardingItems] = useState(initialOnboardingItems);
  const [onboardingProgress, setOnboardingProgress] = useState(initialOnboardingProgress);
  const [view, setView] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState(EMPTY_INVITE);
  const [isInviting, setIsInviting] = useState(false);
  const [memberActionError, setMemberActionError] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);
  const [roleHistory, setRoleHistory] = useState<ActivityLogWithActor[]>([]);
  const [memberToRemove, setMemberToRemove] = useState<MemberRecord | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingForm, setOnboardingForm] = useState(EMPTY_ONBOARDING_FORM);
  const [isSavingOnboarding, setIsSavingOnboarding] = useState(false);

  const canAdmin = canChangeRoles(permissionLevel);
  const canManageTeams = permissionLevel === "admin" || permissionLevel === "committee";
  const canManageOnboarding = canManageTeams;

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const value = `${member.user?.full_name ?? ""} ${member.user?.email ?? ""} ${member.role}`.toLowerCase();
      return value.includes(search.toLowerCase());
    });
  }, [members, search]);

  const manageableTeams = useMemo(
    () => (canAdmin ? teams : teams.filter((team) => team.lead_user_id === currentUserId)),
    [canAdmin, currentUserId, teams]
  );

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const progressByMemberAndItem = useMemo(() => {
    const map = new Map<string, OnboardingProgressRecord>();
    onboardingProgress.forEach((entry) => map.set(`${entry.user_id}_${entry.item_id}`, entry));
    return map;
  }, [onboardingProgress]);

  const getOnboardingSummary = (member: MemberRecord) => {
    const requiredItems = onboardingItems.filter((item) => item.required);
    const trackedItems = requiredItems.length ? requiredItems : onboardingItems;
    const approved = trackedItems.filter((item) => progressByMemberAndItem.get(`${member.user_id}_${item.id}`)?.status === "approved").length;
    const submitted = trackedItems.filter((item) => progressByMemberAndItem.get(`${member.user_id}_${item.id}`)?.status === "submitted").length;
    const touched = trackedItems.filter((item) => progressByMemberAndItem.has(`${member.user_id}_${item.id}`)).length;
    const total = trackedItems.length;
    const state = total === 0 ? "not_configured" : approved === total ? "complete" : touched === 0 ? "not_started" : "partial";

    return { approved, submitted, total, state };
  };

  const canApproveMember = (member: MemberRecord) => canAdmin || member.team_lead_user_id === currentUserId;

  useEffect(() => {
    if (!selectedMember) {
      return;
    }

    let isMounted = true;

    void client
      .from("activity_logs")
      .select("id, organization_id, actor_user_id, action, metadata, created_at, actor:users(id, full_name, email, avatar_url)")
      .eq("organization_id", orgId)
      .contains("metadata", { member_user_id: selectedMember.user_id })
      .order("created_at", { ascending: false })
      .then((result: { data: ActivityLogWithActor[] | null }) => {
        if (isMounted) {
          setRoleHistory(result.data ?? []);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [client, orgId, selectedMember]);

  const inviteMember = async () => {
    if (!inviteForm.email.trim()) {
      return;
    }

    setIsInviting(true);
    setMemberActionError(null);
    const result = await inviteMemberAction({
      organizationId: orgId,
      email: inviteForm.email.trim(),
      role: inviteForm.role
    });

    if (!result.error) {
      setInviteOpen(false);
      setInviteForm(EMPTY_INVITE);
    } else {
      setMemberActionError(result.error);
    }

    setIsInviting(false);
  };

  const updateRole = async (member: MemberRecord, role: MembershipRole) => {
    setMemberActionError(null);
    const result = await updateMemberRole({
      organizationId: orgId,
      membershipId: member.id,
      role
    });

    if (!result.error) {
      const permission_level = permissionForRole(role);
      setMembers((current) => current.map((entry) => (entry.id === member.id ? { ...entry, role, permission_level } : entry)));
      if (selectedMember?.id === member.id) {
        setSelectedMember({ ...member, role, permission_level });
      }
    } else {
      setMemberActionError(result.error);
    }
  };

  const updateTeam = async (member: MemberRecord, teamId: string | null) => {
    setMemberActionError(null);
    const result = await updateMemberTeam({
      organizationId: orgId,
      membershipId: member.id,
      teamId
    });

    if (!result.error) {
      const team = teamId ? teamById.get(teamId) : null;
      setMembers((current) =>
        current.map((entry) => (entry.id === member.id ? { ...entry, team_id: teamId, team_lead_user_id: team?.lead_user_id ?? null } : entry))
      );
      if (selectedMember?.id === member.id) {
        setSelectedMember({ ...member, team_id: teamId, team_lead_user_id: team?.lead_user_id ?? null });
      }
    } else {
      setMemberActionError(result.error);
    }
  };

  const createTeam = async () => {
    if (!teamName.trim()) {
      return;
    }

    setIsCreatingTeam(true);
    setMemberActionError(null);
    const result = await createTeamAction({
      organizationId: orgId,
      name: teamName.trim()
    });

    if (result.error || !result.team) {
      setMemberActionError(result.error ?? "Could not create team.");
    } else {
      const createdTeam = result.team;
      setTeams((current) => [
        ...current,
        {
          ...createdTeam,
          lead: members.find((member) => member.user_id === createdTeam.lead_user_id)?.user ?? null
        }
      ]);
      setTeamName("");
      setTeamOpen(false);
    }

    setIsCreatingTeam(false);
  };

  const createChecklistItem = async () => {
    if (!onboardingForm.title.trim()) {
      return;
    }

    setIsSavingOnboarding(true);
    setMemberActionError(null);
    const result = await createOnboardingItem({
      organizationId: orgId,
      title: onboardingForm.title,
      description: onboardingForm.description,
      required: onboardingForm.required,
      requiresApproval: onboardingForm.requiresApproval
    });

    if (result.error || !result.item) {
      setMemberActionError(result.error ?? "Could not create onboarding item.");
    } else {
      setOnboardingItems((current) => [...current, result.item as OnboardingItemRecord]);
      setOnboardingForm(EMPTY_ONBOARDING_FORM);
      setOnboardingOpen(false);
    }

    setIsSavingOnboarding(false);
  };

  const deleteChecklistItem = async (itemId: string) => {
    setMemberActionError(null);
    const result = await deleteOnboardingItem({ organizationId: orgId, itemId });

    if (result.error) {
      setMemberActionError(result.error);
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

  const submitChecklistItem = async (member: MemberRecord, item: OnboardingItemRecord) => {
    setMemberActionError(null);
    const result = await submitOnboardingItem({
      organizationId: orgId,
      userId: member.user_id,
      itemId: item.id
    });

    if (result.error || !result.progress) {
      setMemberActionError(result.error ?? "Could not update onboarding progress.");
    } else {
      upsertProgress(result.progress);
    }
  };

  const approveChecklistItem = async (member: MemberRecord, item: OnboardingItemRecord) => {
    setMemberActionError(null);
    const result = await approveOnboardingItem({
      organizationId: orgId,
      userId: member.user_id,
      itemId: item.id
    });

    if (result.error || !result.progress) {
      setMemberActionError(result.error ?? "Could not approve onboarding item.");
    } else {
      upsertProgress(result.progress);
    }
  };

  const removeMember = async () => {
    if (!memberToRemove) {
      return;
    }

    setMemberActionError(null);
    const result = await removeMemberAction({
      organizationId: orgId,
      membershipId: memberToRemove.id
    });

    if (!result.error) {
      setMembers((current) => current.filter((member) => member.id !== memberToRemove.id));
      if (selectedMember?.id === memberToRemove.id) {
        setSelectedMember(null);
      }
      setMemberToRemove(null);
    } else {
      setMemberActionError(result.error);
    }
  };

  const leaveCurrentSociety = async () => {
    setIsLeaving(true);
    setMemberActionError(null);

    const result = await leaveOrganization({ organizationId: orgId });

    if (!result.error) {
      if (window.localStorage.getItem(ACTIVE_ORG_STORAGE_KEY) === orgId) {
        window.localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
      }

      setLeaveOpen(false);
      router.push("/dashboard");
      router.refresh();
    } else {
      setMemberActionError(result.error);
    }

    setIsLeaving(false);
  };

  return (
    <div className="space-y-6">
      <section className="surface-card overflow-hidden rounded-[28px]">
        <div className="flex flex-col gap-6 p-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">People and permissions</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">Members</h1>
            <p className="mt-3 max-w-2xl text-base text-[var(--text-secondary)]">
              See who is in the organization, what role they hold, and what work is currently sitting with them.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex rounded-full border border-border bg-[var(--surface)] p-1">
              <button type="button" onClick={() => setView("table")} className={cn("rounded-full px-4 py-2 text-sm", view === "table" ? "bg-primary text-white" : "text-[var(--text-secondary)]")}>
                Table
              </button>
              <button type="button" onClick={() => setView("grid")} className={cn("rounded-full px-4 py-2 text-sm", view === "grid" ? "bg-primary text-white" : "text-[var(--text-secondary)]")}>
                Grid
              </button>
            </div>
            {canAdmin ? (
              <Button onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Invite Member
              </Button>
            ) : null}
            {canManageTeams ? (
              <Button variant="outline" onClick={() => setTeamOpen(true)}>
                <Plus className="h-4 w-4" />
                Create team
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setLeaveOpen(true)}>
              <LogOut className="h-4 w-4" />
              Leave society
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-border bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-4">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search members by name, email, or role" />
        {memberActionError ? <p className="mt-3 text-sm font-medium text-red-400">{memberActionError}</p> : null}
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          <p className="font-semibold">Admin roles</p>
          <p className="mt-1">President, Secretary, and Treasurer can see everything and manage roles.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
          <p className="font-semibold">Committee</p>
          <p className="mt-1">Committee members can manage handovers, resources, tasks, and meetings.</p>
        </div>
        <div className="rounded-2xl border border-border bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          <p className="font-semibold text-foreground">Members</p>
          <p className="mt-1">Members can log in and explore the society workspace.</p>
        </div>
      </section>

      <section className="rounded-[24px] border border-border bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">New member onboarding</h2>
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
              Create the standard induction list for every new member. Items that require approval let members submit completion for their head to verify.
            </p>
          </div>
          {canManageOnboarding ? (
            <Button variant="outline" onClick={() => setOnboardingOpen(true)}>
              <Plus className="h-4 w-4" />
              Add onboarding item
            </Button>
          ) : null}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {onboardingItems.length ? (
            onboardingItems.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border bg-[var(--surface-2)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{item.title}</p>
                    {item.description ? <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">{item.description}</p> : null}
                  </div>
                  {canManageOnboarding ? (
                    <button type="button" onClick={() => void deleteChecklistItem(item.id)} className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.required ? <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Required</span> : null}
                  {item.requires_approval ? <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">Needs approval</span> : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-[var(--surface-2)] px-4 py-6 text-sm text-[var(--text-secondary)] md:col-span-2 xl:col-span-4">
              No onboarding items yet. Add things like pay membership, join Slack, request Drive access, and connect GitHub.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[24px] border border-border bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Teams</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Committee can create teams and assign work to the members they lead.
            </p>
          </div>
          {canManageTeams ? (
            <Button variant="outline" onClick={() => setTeamOpen(true)}>
              <Plus className="h-4 w-4" />
              New team
            </Button>
          ) : null}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {teams.length ? (
            teams.map((team) => {
              const count = members.filter((member) => member.team_id === team.id).length;
              const teamMembers = members.filter((member) => member.team_id === team.id);
              const complete = teamMembers.filter((member) => getOnboardingSummary(member).state === "complete").length;
              const pending = teamMembers.filter((member) => getOnboardingSummary(member).submitted > 0).length;
              return (
                <div key={team.id} className="rounded-2xl border border-border bg-[var(--surface-2)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{team.name}</p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        Led by {team.lead?.full_name ?? team.lead?.email ?? "Unknown lead"}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {count} {count === 1 ? "member" : "members"}
                    </span>
                  </div>
                  {onboardingItems.length ? (
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-[var(--surface)] px-3 py-2 text-[var(--text-secondary)]">
                        <span className="font-semibold text-foreground">{complete}</span> fully inducted
                      </div>
                      <div className="rounded-xl bg-[var(--surface)] px-3 py-2 text-[var(--text-secondary)]">
                        <span className="font-semibold text-foreground">{pending}</span> awaiting approval
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-[var(--surface-2)] px-4 py-6 text-sm text-[var(--text-secondary)] md:col-span-2 xl:col-span-3">
              No teams yet. Create a team for sponsorship, events, marketing, or any committee area that owns work.
            </div>
          )}
        </div>
      </section>

      {view === "table" ? (
        <section className="overflow-hidden rounded-[24px] border border-border bg-[color-mix(in_srgb,var(--surface)_96%,transparent)]">
          <div className="grid grid-cols-[minmax(0,1.4fr)_140px_180px_150px_minmax(0,1fr)_80px] gap-3 border-b border-border px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            <span>Member</span>
            <span>Role</span>
            <span>Team</span>
            <span>Onboarding</span>
            <span>Email</span>
            <span />
          </div>
          <div className="divide-y divide-border">
            {filteredMembers.map((member) => {
              const summary = getOnboardingSummary(member);
              return (
              <div key={member.id} className="grid grid-cols-[minmax(0,1.4fr)_140px_180px_150px_minmax(0,1fr)_80px] gap-3 px-5 py-4">
                <button type="button" onClick={() => setSelectedMember(member)} className="flex items-center gap-3 text-left">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.user?.avatar_url ?? undefined} alt={member.user?.full_name ?? member.user?.email ?? "Member"} />
                    <AvatarFallback>{getInitials(member.user?.full_name ?? null, member.user?.email ?? null)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm font-medium text-foreground">{member.user?.full_name ?? member.user?.email ?? "Unknown member"}</span>
                </button>
                <div>
                  {canAdmin ? (
                    <select
                      value={member.role}
                      onChange={(event) => void updateRole(member, event.target.value as MembershipRole)}
                      className={cn("rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]", getRoleBadgeClasses(member.role))}
                    >
                      {SOCIETY_ROLE_OPTIONS.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]", getRoleBadgeClasses(member.role))}>
                      {formatRoleLabel(member.role)}
                    </span>
                  )}
                </div>
                <div>
                  {canManageTeams ? (
                    <select
                      value={member.team_id ?? ""}
                      onChange={(event) => void updateTeam(member, event.target.value || null)}
                      disabled={!canAdmin && member.role !== "member"}
                      className="flex h-8 w-full rounded-lg border border-border bg-[var(--surface)] px-2 text-xs text-foreground"
                    >
                      <option value="">Exec / unassigned</option>
                      {manageableTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm text-[var(--text-secondary)]">
                      {member.team_id ? teamById.get(member.team_id)?.name ?? "Unknown team" : "Exec / unassigned"}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold",
                    summary.state === "complete"
                      ? "bg-emerald-100 text-emerald-700"
                      : summary.state === "partial"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-[var(--surface-2)] text-[var(--text-secondary)]"
                  )}
                >
                  {summary.state === "complete"
                    ? "Fully inducted"
                    : summary.state === "partial"
                      ? `${summary.approved}/${summary.total} approved`
                      : summary.state === "not_configured"
                        ? "Not configured"
                        : "Not started"}
                </span>
                <span className="truncate text-sm text-[var(--text-secondary)]">{member.user?.email ?? "No email"}</span>
                <div className="flex justify-end">
                  {canAdmin ? (
                    <Button variant="ghost" size="icon" onClick={() => setMemberToRemove(member)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            );
            })}
          </div>
        </section>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredMembers.map((member) => {
            const summary = getOnboardingSummary(member);
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
                  <span className={cn("rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]", getRoleBadgeClasses(member.role))}>
                    {formatRoleLabel(member.role)}
                  </span>
                </div>
                <h2 className="mt-4 text-lg font-semibold text-foreground">{member.user?.full_name ?? member.user?.email ?? "Unknown member"}</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{member.user?.email ?? "No email"}</p>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  Team: {member.team_id ? teamById.get(member.team_id)?.name ?? "Unknown team" : "Exec / unassigned"}
                </p>
                <div className="mt-4 rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                  <span className="font-semibold text-foreground">{summary.approved}/{summary.total}</span> onboarding checks approved
                </div>
                <p className="mt-4 text-sm text-[var(--text-secondary)]">Joined {formatDate(member.joined_at)}</p>
              </button>
            );
          })}
        </section>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>Create a pending invite for a new member to join this organization.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-6 pt-2">
            <Input value={inviteForm.email} onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email address" />
            <select value={inviteForm.role} onChange={(event) => setInviteForm((current) => ({ ...current, role: event.target.value as MembershipRole }))} className="flex h-10 rounded-lg border border-border bg-[var(--surface)] px-3 text-sm">
              {SOCIETY_ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <div className="rounded-2xl border border-border bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              President, Secretary, and Treasurer are full admins. Committee members can manage handovers, tasks, meetings, and resources. Members can view society content.
            </div>
            <div className="rounded-2xl border border-border bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              This creates a pending invite record. Email delivery depends on your outbound email setup.
            </div>
            {memberActionError ? <p className="text-sm font-medium text-red-400">{memberActionError}</p> : null}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void inviteMember()} disabled={isInviting || !inviteForm.email.trim()}>
                {isInviting ? "Sending..." : "Send invite"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create team</DialogTitle>
            <DialogDescription>
              This creates a team led by you. Members assigned to it can receive team tasks from their committee lead.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-6 pt-2">
            <Input value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="e.g. Sponsorship Team" />
            <div className="rounded-2xl border border-border bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              Admins can assign members into any team. Committee leads can assign general members into teams they created.
            </div>
            {memberActionError ? <p className="text-sm font-medium text-red-400">{memberActionError}</p> : null}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setTeamOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void createTeam()} disabled={isCreatingTeam || !teamName.trim()}>
                {isCreatingTeam ? "Creating..." : "Create team"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={onboardingOpen} onOpenChange={setOnboardingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add onboarding item</DialogTitle>
            <DialogDescription>Add a standard step every new member should complete.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-6 pt-2">
            <Input
              value={onboardingForm.title}
              onChange={(event) => setOnboardingForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="e.g. Pay membership fee"
            />
            <Textarea
              value={onboardingForm.description}
              onChange={(event) => setOnboardingForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Explain what the member needs to do or where to go."
              className="min-h-[100px]"
            />
            <label className="flex items-center gap-3 rounded-2xl border border-border bg-[var(--surface-2)] px-4 py-3 text-sm text-foreground">
              <input
                type="checkbox"
                checked={onboardingForm.required}
                onChange={(event) => setOnboardingForm((current) => ({ ...current, required: event.target.checked }))}
              />
              Required for full induction
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-border bg-[var(--surface-2)] px-4 py-3 text-sm text-foreground">
              <input
                type="checkbox"
                checked={onboardingForm.requiresApproval}
                onChange={(event) => setOnboardingForm((current) => ({ ...current, requiresApproval: event.target.checked }))}
              />
              Requires head/admin approval
            </label>
            {memberActionError ? <p className="text-sm font-medium text-red-400">{memberActionError}</p> : null}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setOnboardingOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void createChecklistItem()} disabled={isSavingOnboarding || !onboardingForm.title.trim()}>
                {isSavingOnboarding ? "Saving..." : "Add item"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave society</DialogTitle>
            <DialogDescription>
              This removes your membership from this society. You can rejoin later with a society code or a new invite.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-6 pt-2">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              If you are the final admin, you will need to assign another President, Secretary, or Treasurer before leaving.
            </div>
            {memberActionError ? <p className="text-sm font-medium text-red-400">{memberActionError}</p> : null}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setLeaveOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => void leaveCurrentSociety()} disabled={isLeaving}>
                {isLeaving ? "Leaving..." : "Leave society"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(memberToRemove)} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove member</DialogTitle>
            <DialogDescription>This will remove their membership from the organization.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-6 pt-2">
            <p className="text-sm text-[var(--text-secondary)]">
              Remove {memberToRemove?.user?.full_name ?? memberToRemove?.user?.email ?? "this member"} from the organization?
            </p>
            {memberActionError ? <p className="text-sm font-medium text-red-400">{memberActionError}</p> : null}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setMemberToRemove(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => void removeMember()}>
                Remove
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(selectedMember)} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <SheetContent className="overflow-y-auto">
          {selectedMember ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedMember.user?.full_name ?? selectedMember.user?.email ?? "Member profile"}</SheetTitle>
                <SheetDescription>{selectedMember.user?.email ?? "No email address"}</SheetDescription>
              </SheetHeader>
              <div className="space-y-6 p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedMember.user?.avatar_url ?? undefined} alt={selectedMember.user?.full_name ?? selectedMember.user?.email ?? "Member"} />
                    <AvatarFallback>{getInitials(selectedMember.user?.full_name ?? null, selectedMember.user?.email ?? null)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-lg font-semibold text-foreground">{selectedMember.user?.full_name ?? "Unnamed member"}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{selectedMember.user?.email ?? "No email"}</p>
                    <span className={cn("mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]", getRoleBadgeClasses(selectedMember.role))}>
                      {formatRoleLabel(selectedMember.role)}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-[var(--surface-2)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Joined</p>
                  <p className="mt-2 text-sm text-foreground">{formatDate(selectedMember.joined_at)}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Onboarding</h3>
                    {(() => {
                      const summary = getOnboardingSummary(selectedMember);
                      return (
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          {summary.approved}/{summary.total} approved
                        </span>
                      );
                    })()}
                  </div>
                  <div className="space-y-3">
                    {onboardingItems.length ? (
                      onboardingItems.map((item) => {
                        const progress = progressByMemberAndItem.get(`${selectedMember.user_id}_${item.id}`);
                        const isOwnProfile = selectedMember.user_id === currentUserId;
                        const approvable = canApproveMember(selectedMember);
                        const isApproved = progress?.status === "approved";
                        const isSubmitted = progress?.status === "submitted";
                        return (
                          <div key={item.id} className="rounded-2xl border border-border bg-[var(--surface-2)] p-4">
                            <div className="flex items-start gap-3">
                              <div
                                className={cn(
                                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl",
                                  isApproved ? "bg-emerald-100 text-emerald-700" : isSubmitted ? "bg-amber-100 text-amber-700" : "bg-[var(--surface)] text-[var(--text-muted)]"
                                )}
                              >
                                {isApproved ? <CheckCircle2 className="h-4 w-4" /> : isSubmitted ? <Clock3 className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-medium text-foreground">{item.title}</p>
                                  {item.required ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Required</span> : null}
                                </div>
                                {item.description ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.description}</p> : null}
                                <p className="mt-2 text-xs text-[var(--text-muted)]">
                                  {isApproved
                                    ? `Approved${progress.approver?.full_name ? ` by ${progress.approver.full_name}` : ""}`
                                    : isSubmitted
                                      ? "Submitted, waiting for approval"
                                      : "Not started"}
                                </p>
                              </div>
                            </div>
                            <div className="mt-4 flex flex-wrap justify-end gap-2">
                              {!isApproved && (isOwnProfile || approvable) ? (
                                <Button size="sm" variant={isSubmitted ? "outline" : "default"} onClick={() => void submitChecklistItem(selectedMember, item)}>
                                  {item.requires_approval ? "Mark done" : "Complete"}
                                </Button>
                              ) : null}
                              {!isApproved && (isSubmitted || approvable) && approvable ? (
                                <Button size="sm" onClick={() => void approveChecklistItem(selectedMember, item)}>
                                  Approve
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border bg-[var(--surface-2)] px-4 py-6 text-sm text-[var(--text-secondary)]">
                        No onboarding checklist has been configured yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Assigned tasks</h3>
                  <div className="space-y-3">
                    {tasks.filter((task) => task.assigned_to === selectedMember.user_id).length ? (
                      tasks
                        .filter((task) => task.assigned_to === selectedMember.user_id)
                        .map((task) => (
                          <div key={task.id} className="rounded-2xl border border-border bg-[var(--surface-2)] p-4">
                            <p className="text-sm font-medium text-foreground">{task.title}</p>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">{task.description ?? "No description"}</p>
                            <p className="mt-2 text-xs text-[var(--text-muted)]">{task.due_date ? `Due ${formatDate(task.due_date)}` : "No due date"}</p>
                          </div>
                        ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border bg-[var(--surface-2)] px-4 py-6 text-sm text-[var(--text-secondary)]">
                        Nothing is assigned to this member right now.
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Role history</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 rounded-2xl border border-border bg-[var(--surface-2)] p-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--surface)] text-primary">
                        <Users2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Joined the organization as {formatRoleLabel(selectedMember.role)}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{formatDate(selectedMember.joined_at)}</p>
                      </div>
                    </div>
                    {roleHistory.length ? (
                      roleHistory.map((entry) => (
                        <div key={entry.id} className="flex items-start gap-3 rounded-2xl border border-border bg-[var(--surface-2)] p-4">
                          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--surface)] text-primary">
                            <Shield className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm text-foreground">
                              <span className="font-medium">{entry.actor?.full_name ?? entry.actor?.email ?? "A manager"}</span>{" "}
                              <span className="text-[var(--text-secondary)]">{entry.action}</span>
                            </p>
                            <p className="mt-1 text-xs text-[var(--text-secondary)]">{formatRelativeTime(entry.created_at)}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border bg-[var(--surface-2)] px-4 py-6 text-sm text-[var(--text-secondary)]">
                        No logged role changes yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
