"use client";

import { useEffect, useMemo, useState } from "react";
import { LogOut, Plus, Shield, Trash2, UserPlus, Users2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createTeam as createTeamAction, inviteMember as inviteMemberAction, leaveOrganization, removeMember as removeMemberAction, updateMemberRole, updateMemberTeam } from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createBrowserBackendClient } from "@/lib/backend/client";
import { ACTIVE_ORG_STORAGE_KEY } from "@/lib/org-state";
import { canChangeRoles, formatRoleLabel, getInitials, getRoleBadgeClasses, permissionForRole, SOCIETY_ROLE_OPTIONS } from "@/lib/workspace";
import type { ActivityLogWithActor, MemberRecord, MembershipRole, PermissionLevel, TaskRecord, TeamRecord } from "@/types";
import { formatDate, formatRelativeTime } from "@/utils/format";
import { cn } from "@/utils/cn";

type MembersWorkspaceProps = {
  initialMembers: MemberRecord[];
  tasks: TaskRecord[];
  teams: TeamRecord[];
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

export function MembersWorkspace({ initialMembers, tasks, teams: initialTeams, orgId, currentUserId, permissionLevel }: MembersWorkspaceProps) {
  const router = useRouter();
  const backend = useMemo(() => createBrowserBackendClient(), []);
  const client = backend as any;
  const [members, setMembers] = useState(initialMembers);
  const [teams, setTeams] = useState(initialTeams);
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

  const canAdmin = canChangeRoles(permissionLevel);
  const canManageTeams = permissionLevel === "admin" || permissionLevel === "committee";

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
          <div className="grid grid-cols-[minmax(0,1.4fr)_140px_180px_minmax(0,1fr)_120px_80px] gap-3 border-b border-border px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            <span>Member</span>
            <span>Role</span>
            <span>Team</span>
            <span>Email</span>
            <span>Joined</span>
            <span />
          </div>
          <div className="divide-y divide-border">
            {filteredMembers.map((member) => (
              <div key={member.id} className="grid grid-cols-[minmax(0,1.4fr)_140px_180px_minmax(0,1fr)_120px_80px] gap-3 px-5 py-4">
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
                <span className="truncate text-sm text-[var(--text-secondary)]">{member.user?.email ?? "No email"}</span>
                <span className="text-sm text-[var(--text-secondary)]">{formatDate(member.joined_at)}</span>
                <div className="flex justify-end">
                  {canAdmin ? (
                    <Button variant="ghost" size="icon" onClick={() => setMemberToRemove(member)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredMembers.map((member) => (
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
              <p className="mt-4 text-sm text-[var(--text-secondary)]">Joined {formatDate(member.joined_at)}</p>
            </button>
          ))}
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
