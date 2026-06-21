"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import type { MembershipRow, OrganizationWithMembership, TaskRecord, UserRow } from "@/types";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskDetailDrawer } from "@/components/tasks/TaskDetailDrawer";
import { TaskTable } from "@/components/tasks/TaskTable";
import { Button } from "@/components/ui/button";
import { createBrowserBackendClient } from "@/lib/backend/client";

type MemberOption = MembershipRow & { user: UserRow | null };

type TasksWorkspaceProps = {
  initialTasks: TaskRecord[];
  members: MemberOption[];
  currentUser: UserRow;
  currentOrg: OrganizationWithMembership;
};

export function TasksWorkspace({ initialTasks, members, currentUser, currentOrg }: TasksWorkspaceProps) {
  const [tasks, setTasks] = useState<TaskRecord[]>(initialTasks);
  const [view, setView] = useState<"kanban" | "table" | "my_tasks">("kanban");
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<"todo" | "in_progress" | "done">("todo");
  const backend = useMemo(() => createBrowserBackendClient(), []);
  const client = backend as any;
  const currentMembership = currentOrg.membership.permission_level;
  const canDelete = currentMembership === "admin" || currentMembership === "committee";

  const updateTaskStatus = async (taskId: string, status: "todo" | "in_progress" | "done") => {
    const previousTasks = tasks;
    const nextTasks = tasks.map((task) => (task.id === taskId ? { ...task, status } : task));
    setTasks(nextTasks);

    const result = await client
      .from("tasks")
      .update({ status })
      .eq("id", taskId)
      .select(
        "id, organization_id, title, description, assigned_to, created_by, source_meeting_id, due_date, status, priority, recurring_rule, created_at, assignee:users!tasks_assigned_to_fkey(id, full_name, email, avatar_url)"
      )
      .single();

    if (result.error) {
      setTasks(previousTasks);
      return;
    }

    setTasks((current) => current.map((task) => (task.id === taskId ? (result.data as TaskRecord) : task)));
    await client.from("activity_logs").insert({
      organization_id: currentOrg.id,
      actor_user_id: currentUser.id,
      action: `moved a task to ${status.replace("_", " ")}`,
      metadata: {
        task_id: taskId
      }
    });
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex rounded-2xl border border-border bg-[var(--surface)] p-1">
            {[
              { key: "kanban", label: "Kanban" },
              { key: "table", label: "Table" },
              { key: "my_tasks", label: "My Tasks" }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setView(tab.key as typeof view)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  view === tab.key ? "bg-primary text-white" : "text-[var(--text-secondary)] hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Button
            onClick={() => {
              setDefaultStatus("todo");
              setCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>

        {view === "kanban" ? (
          <KanbanBoard
            tasks={tasks}
            onStatusChange={updateTaskStatus}
            onTaskClick={setSelectedTask}
            onAddTask={(status) => {
              setDefaultStatus(status);
              setCreateOpen(true);
            }}
          />
        ) : (
          <TaskTable tasks={tasks} members={members} currentUserId={currentUser.id} myTasksOnly={view === "my_tasks"} onTaskClick={setSelectedTask} />
        )}
      </div>

      <TaskDetailDrawer
        open={Boolean(selectedTask)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTask(null);
          }
        }}
        task={selectedTask}
        members={members}
        orgId={currentOrg.id}
        currentUserId={currentUser.id}
        canDelete={canDelete}
        onTaskUpdated={(updated) => {
          setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)));
          setSelectedTask(updated);
        }}
        onTaskDeleted={(taskId) => {
          setTasks((current) => current.filter((task) => task.id !== taskId));
          setSelectedTask(null);
        }}
      />

      <CreateTaskModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        orgId={currentOrg.id}
        currentUserId={currentUser.id}
        members={members}
        defaultStatus={defaultStatus}
        onTaskCreated={(task) => setTasks((current) => [task, ...current])}
      />
    </>
  );
}
