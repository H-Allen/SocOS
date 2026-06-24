"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

import { deleteTask, updateTask } from "@/app/actions/tasks";
import { createBrowserBackendClient } from "@/lib/backend/client";
import type { ActivityLogWithActor, MembershipRow, PermissionLevel, TaskRecord, UserRow } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatRelativeTime } from "@/utils/format";
import { cn } from "@/utils/cn";

type MemberOption = MembershipRow & { user: UserRow | null };

type TaskDetailDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskRecord | null;
  members: MemberOption[];
  orgId: string;
  currentUserId: string;
  currentPermissionLevel: PermissionLevel;
  canDelete: boolean;
  onTaskUpdated: (task: TaskRecord) => void;
  onTaskDeleted: (taskId: string) => void;
};

function getInitials(name: string | null, email: string | null) {
  const value = name ?? email ?? "User";
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TaskDetailDrawer({
  open,
  onOpenChange,
  task,
  members,
  orgId,
  currentUserId,
  currentPermissionLevel,
  canDelete,
  onTaskUpdated,
  onTaskDeleted
}: TaskDetailDrawerProps) {
  const backend = useMemo(() => createBrowserBackendClient(), []);
  const client = backend as any;
  const [localTask, setLocalTask] = useState<TaskRecord | null>(task);
  const [activity, setActivity] = useState<ActivityLogWithActor[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const hasUserEditedRef = useRef(false);
  const canFullyEdit =
    Boolean(localTask) &&
    (currentPermissionLevel === "admin" ||
      (currentPermissionLevel === "committee" && localTask?.team_lead_user_id === currentUserId) ||
      (localTask?.visibility === "private" && localTask.created_by === currentUserId));
  const canUpdateStatus = canFullyEdit || localTask?.assigned_to === currentUserId;

  useEffect(() => {
    hasUserEditedRef.current = false;
    setLocalTask(task);
  }, [task]);

  const updateLocalTask = (nextTask: TaskRecord) => {
    hasUserEditedRef.current = true;
    setLocalTask(nextTask);
  };

  useEffect(() => {
    if (!open || !task) {
      return;
    }

    let isMounted = true;

    void client
      .from("activity_logs")
      .select("id, organization_id, actor_user_id, action, metadata, created_at, actor:users(id, full_name, email, avatar_url)")
      .eq("organization_id", orgId)
      .contains("metadata", { task_id: task.id })
      .order("created_at", { ascending: false })
      .then((result: { data: ActivityLogWithActor[] | null }) => {
        if (isMounted) {
          setActivity(result.data ?? []);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [client, open, orgId, task]);

  useEffect(() => {
    if (!localTask || !task || !hasUserEditedRef.current) {
      return;
    }

    const hasChanged =
      localTask.title !== task.title ||
      localTask.description !== task.description ||
      localTask.status !== task.status ||
      localTask.priority !== task.priority ||
      localTask.assigned_to !== task.assigned_to ||
      localTask.due_date !== task.due_date ||
      localTask.recurring_rule !== task.recurring_rule;

    if (!hasChanged) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      const result = await updateTask({
        taskId: localTask.id,
        title: canFullyEdit ? localTask.title : undefined,
        description: canFullyEdit ? localTask.description : undefined,
        status: localTask.status,
        priority: canFullyEdit ? localTask.priority : undefined,
        assignedTo: canFullyEdit ? localTask.assigned_to : undefined,
        dueDate: canFullyEdit ? localTask.due_date : undefined,
        recurringRule: canFullyEdit ? localTask.recurring_rule : undefined
      });

      if (!result.error && result.task) {
        hasUserEditedRef.current = false;
        onTaskUpdated(result.task);
      }
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [canFullyEdit, localTask, onTaskUpdated, task]);

  const filteredMembers = members.filter((member) => {
    if (localTask?.visibility === "team" && member.user_id !== localTask.team_lead_user_id && member.team_id !== localTask.team_id) {
      return false;
    }

    if (currentPermissionLevel === "committee" && localTask?.visibility !== "team" && member.user_id !== currentUserId && member.team_lead_user_id !== currentUserId) {
      return false;
    }

    const value = `${member.user?.full_name ?? ""} ${member.user?.email ?? ""}`.toLowerCase();
    return value.includes(assigneeFilter.toLowerCase());
  });

  const handleDelete = async () => {
    if (!localTask) {
      return;
    }

    const result = await deleteTask({ taskId: localTask.id });
    if (result.error) return;
    onTaskDeleted(localTask.id);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        {localTask ? (
          <>
            <SheetHeader>
              <SheetTitle>Task details</SheetTitle>
              <SheetDescription>Changes save automatically as you edit.</SheetDescription>
            </SheetHeader>
            <div className="space-y-6 p-6">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Title</label>
                <Input disabled={!canFullyEdit} value={localTask.title} onChange={(event) => updateLocalTask({ ...localTask, title: event.target.value })} />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Description</label>
                <Textarea disabled={!canFullyEdit} value={localTask.description ?? ""} onChange={(event) => updateLocalTask({ ...localTask, description: event.target.value })} className="min-h-[140px]" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Status</label>
                  <select
                    value={localTask.status ?? "todo"}
                    disabled={!canUpdateStatus}
                    onChange={(event) => updateLocalTask({ ...localTask, status: event.target.value as TaskRecord["status"] })}
                    className="flex h-10 w-full rounded-lg border border-border bg-[var(--surface)] px-3 text-sm"
                  >
                    <option value="todo">Todo</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Priority</label>
                  <select
                    value={localTask.priority ?? "medium"}
                    disabled={!canFullyEdit}
                    onChange={(event) => updateLocalTask({ ...localTask, priority: event.target.value as TaskRecord["priority"] })}
                    className="flex h-10 w-full rounded-lg border border-border bg-[var(--surface)] px-3 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Due date</label>
                  <Input disabled={!canFullyEdit} type="date" value={localTask.due_date ?? ""} onChange={(event) => updateLocalTask({ ...localTask, due_date: event.target.value || null })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Recurring rule</label>
                  <Input disabled={!canFullyEdit} value={localTask.recurring_rule ?? ""} onChange={(event) => updateLocalTask({ ...localTask, recurring_rule: event.target.value || null })} placeholder="weekly" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Assignee</label>
                <Input disabled={!canFullyEdit} value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)} placeholder="Search members" />
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-2xl border border-border bg-[var(--surface-2)] p-2">
                  <button
                    type="button"
                    disabled={!canFullyEdit}
                    onClick={() => updateLocalTask({ ...localTask, assigned_to: null, assignee: null })}
                    className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface)] hover:text-foreground"
                  >
                    Unassigned
                  </button>
                  {filteredMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      disabled={!canFullyEdit}
                      onClick={() =>
                        updateLocalTask({
                          ...localTask,
                          assigned_to: member.user_id,
                          assignee: member.user
                        })
                      }
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-[var(--surface)]",
                        localTask.assigned_to === member.user_id ? "bg-[var(--surface)]" : ""
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user?.avatar_url ?? undefined} alt={member.user?.full_name ?? member.user?.email ?? "Member"} />
                        <AvatarFallback>{getInitials(member.user?.full_name ?? null, member.user?.email ?? null)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{member.user?.full_name ?? member.user?.email ?? "Unknown member"}</p>
                        <p className="truncate text-xs text-[var(--text-secondary)]">{member.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Activity</h3>
                <div className="space-y-3 rounded-2xl border border-border bg-[var(--surface-2)] p-4">
                  {activity.length ? (
                    activity.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={entry.actor?.avatar_url ?? undefined} alt={entry.actor?.full_name ?? entry.actor?.email ?? "Actor"} />
                          <AvatarFallback>{getInitials(entry.actor?.full_name ?? null, entry.actor?.email ?? null)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm text-foreground">
                            <span className="font-medium">{entry.actor?.full_name ?? entry.actor?.email ?? "A member"}</span>{" "}
                            <span className="text-[var(--text-secondary)]">{entry.action}</span>
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">{formatRelativeTime(entry.created_at)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)]">No task activity yet.</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4">
                <div className="text-xs text-[var(--text-muted)]">{localTask.due_date ? `Due ${formatDate(localTask.due_date)}` : "No due date set"}</div>
                {canDelete ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/15"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete task
                  </button>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
