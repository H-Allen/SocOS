"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, Shield, Trash2, UserPlus, Users2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createBrowserBackendClient } from "@/lib/backend/client";
import { canManageWorkspace, formatRoleLabel, getInitials, getRoleBadgeClasses, isAdmin } from "@/lib/workspace";
import type { ActivityLogWithActor, InviteStatus, MemberRecord, MembershipRole, PermissionLevel, TaskRecord } from "@/types";
import { formatDate, formatRelativeTime } from "@/utils/format";
import { cn } from "@/utils/cn";

type MembersWorkspaceProps = {
  initialMembers: MemberRecord[];
  tasks: TaskRecord[];
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

export function MembersWorkspace({ initialMembers, tasks, orgId, currentUserId, permissionLevel }: MembersWorkspaceProps) {
  const backend = useMemo(() => createBrowserBackendClient(), []);
  const client = backend as any;
  const [members, setMembers] = useState(initialMembers);
  const [view, setView] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState(EMPTY_INVITE);
  const [isInviting, setIsInviting] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);
  const [roleHistory, setRoleHistory] = useState<ActivityLogWithActor[]>([]);
  const [memberToRemove, setMemberToRemove] = useState<MemberRecord | null>(null);

  const canManage = canManageWorkspace(permissionLevel);
  const canAdmin = isAdmin(permissionLevel);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const value = `${member.user?.full_name ?? ""} ${member.user?.email ?? ""} ${member.role}`.toLowerCase();
      return value.includes(search.toLowerCase());
    });
  }, [members, search]);

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
    const { error } = await client.from("invites").insert({
      organization_id: orgId,
      email: inviteForm.email.trim(),
      role: inviteForm.role,
      invited_by: currentUserId,
      status: "pending" satisfies InviteStatus
    });

    if (!error) {
      await client.from("activity_logs").insert({
        organization_id: orgId,
        actor_user_id: currentUserId,
        action: "invited a member",
        metadata: {
          invite_email: inviteForm.email.trim(),
          invite_role: inviteForm.role
        }
      });
      setInviteOpen(false);
      setInviteForm(EMPTY_INVITE);
    }

    setIsInviting(false);
  };

  const updateRole = async (member: MemberRecord, role: MembershipRole) => {
    const { error } = await client.from("memberships").update({ role }).eq("id", member.id);

    if (!error) {
      setMembers((current) => current.map((entry) => (entry.id === member.id ? { ...entry, role } : entry)));
      await client.from("activity_logs").insert({
        organization_id: orgId,
        actor_user_id: currentUserId,
        action: "changed member role",
        metadata: {
          member_user_id: member.user_id,
          from_role: member.role,
          to_role: role
        }
      });
      if (selectedMember?.id === member.id) {
        setSelectedMember({ ...member, role });
      }
    }
  };

  const removeMember = async () => {
    if (!memberToRemove) {
      return;
    }

    const { error } = await client.from("memberships").delete().eq("id", memberToRemove.id);

    if (!error) {
      setMembers((current) => current.filter((member) => member.id !== memberToRemove.id));
      await client.from("activity_logs").insert({
        organization_id: orgId,
        actor_user_id: currentUserId,
        action: "removed a member",
        metadata: {
          member_user_id: memberToRemove.user_id,
          role: memberToRemove.role
        }
      });
      if (selectedMember?.id === memberToRemove.id) {
        setSelectedMember(null);
      }
      setMemberToRemove(null);
    }
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
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-border bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-4">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search members by name, email, or role" />
      </section>

      {view === "table" ? (
        <section className="overflow-hidden rounded-[24px] border border-border bg-[color-mix(in_srgb,var(--surface)_96%,transparent)]">
          <div className="grid grid-cols-[minmax(0,1.5fr)_140px_minmax(0,1.2fr)_120px_80px] gap-3 border-b border-border px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            <span>Member</span>
            <span>Role</span>
            <span>Email</span>
            <span>Joined</span>
            <span />
          </div>
          <div className="divide-y divide-border">
            {filteredMembers.map((member) => (
              <div key={member.id} className="grid grid-cols-[minmax(0,1.5fr)_140px_minmax(0,1.2fr)_120px_80px] gap-3 px-5 py-4">
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
                      <option value="president">President</option>
                      <option value="secretary">Secretary</option>
                      <option value="treasurer">Treasurer</option>
                      <option value="committee">Committee</option>
                      <option value="member">Member</option>
                    </select>
                  ) : (
                    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]", getRoleBadgeClasses(member.role))}>
                      {formatRoleLabel(member.role)}
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
              <option value="president">President</option>
              <option value="secretary">Secretary</option>
              <option value="treasurer">Treasurer</option>
              <option value="committee">Committee</option>
              <option value="member">Member</option>
            </select>
            <div className="rounded-2xl border border-border bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              This creates a pending invite record. Email delivery depends on your outbound email setup.
            </div>
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
