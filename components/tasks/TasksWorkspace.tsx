"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { updateTask } from "@/app/actions/tasks";
import type { MembershipRow, OrganizationWithMembership, TaskRecord, TeamRecord, UserRow } from "@/types";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskDetailDrawer } from "@/components/tasks/TaskDetailDrawer";
import { TaskTable } from "@/components/tasks/TaskTable";
import { Button } from "@/components/ui/button";

type MemberOption = MembershipRow & { user: UserRow | null };

type TasksWorkspaceProps = {
  initialTasks: TaskRecord[];
  members: MemberOption[];
  teams: TeamRecord[];
  currentUser: UserRow;
  currentOrg: OrganizationWithMembership;
};

export function TasksWorkspace({ initialTasks, members, teams, currentUser, currentOrg }: TasksWorkspaceProps) {
  const [tasks, setTasks] = useState<TaskRecord[]>(initialTasks);
  const [view, setView] = useState<"kanban" | "table" | "my_tasks">("kanban");
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<"todo" | "in_progress" | "done">("todo");
  const currentMembership = currentOrg.membership.permission_level;
  const canDelete = currentMembership === "admin" || currentMembership === "committee";

  const updateTaskStatus = async (taskId: string, status: "todo" | "in_progress" | "done") => {
    const previousTasks = tasks;
    const nextTasks = tasks.map((task) => (task.id === taskId ? { ...task, status } : task));
    setTasks(nextTasks);

    const result = await updateTask({ taskId, status });

    if (result.error) {
      setTasks(previousTasks);
      return;
    }

    if (result.task) {
      setTasks((current) => current.map((task) => (task.id === taskId ? result.task as TaskRecord : task)));
    }
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
        currentPermissionLevel={currentMembership}
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
        currentPermissionLevel={currentMembership}
        members={members}
        teams={teams}
        defaultStatus={defaultStatus}
        onTaskCreated={(task) => setTasks((current) => [task, ...current])}
      />
    </>
  );
}
