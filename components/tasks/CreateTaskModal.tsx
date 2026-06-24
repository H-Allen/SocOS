"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createTask } from "@/app/actions/tasks";
import type { MembershipRow, PermissionLevel, TaskRecord, TaskVisibility, TeamRecord, UserRow } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type MemberOption = MembershipRow & { user: UserRow | null };

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  visibility: z.enum(["organization", "team", "private"]).default("organization"),
  team_id: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["todo", "in_progress", "done"]).default("todo")
});

type CreateTaskValues = z.infer<typeof createTaskSchema>;

type CreateTaskModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  currentUserId: string;
  currentPermissionLevel: PermissionLevel;
  members: MemberOption[];
  teams: TeamRecord[];
  defaultStatus?: "todo" | "in_progress" | "done";
  onTaskCreated: (task: TaskRecord) => void;
};

export function CreateTaskModal({
  open,
  onOpenChange,
  orgId,
  currentUserId,
  currentPermissionLevel,
  members,
  teams,
  defaultStatus = "todo",
  onTaskCreated
}: CreateTaskModalProps) {
  const [isPending, startTransition] = useTransition();
  const canManage = currentPermissionLevel === "admin" || currentPermissionLevel === "committee";
  const defaultVisibility: TaskVisibility = canManage ? "team" : "private";
  const form = useForm<CreateTaskValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      assigned_to: "",
      visibility: defaultVisibility,
      team_id: "",
      due_date: "",
      priority: "medium",
      status: defaultStatus
    }
  });

  const visibility = form.watch("visibility");
  const selectedTeamId = form.watch("team_id");
  const manageableTeams = useMemo(
    () => (currentPermissionLevel === "admin" ? teams : teams.filter((team) => team.lead_user_id === currentUserId)),
    [currentPermissionLevel, currentUserId, teams]
  );

  const assignableMembers = useMemo(() => {
    if (visibility === "private") {
      return members.filter((member) => member.user_id === currentUserId);
    }

    if (visibility === "team") {
      if (!selectedTeamId) return [];
      const selectedTeam = teams.find((team) => team.id === selectedTeamId);
      return members.filter((member) => member.user_id === selectedTeam?.lead_user_id || member.team_id === selectedTeamId);
    }

    if (currentPermissionLevel === "admin") {
      return members;
    }

    if (currentPermissionLevel === "committee") {
      return members.filter((member) => member.user_id === currentUserId || member.team_lead_user_id === currentUserId);
    }

    return members.filter((member) => member.user_id === currentUserId);
  }, [currentPermissionLevel, currentUserId, members, selectedTeamId, teams, visibility]);

  useEffect(() => {
    if (visibility === "private") {
      form.setValue("assigned_to", currentUserId);
      form.setValue("team_id", "");
    } else if (visibility === "team" && !manageableTeams.some((team) => team.id === form.getValues("team_id"))) {
      form.setValue("team_id", manageableTeams[0]?.id ?? "");
    } else if (!assignableMembers.some((member) => member.user_id === form.getValues("assigned_to"))) {
      form.setValue("assigned_to", "");
    }
  }, [assignableMembers, currentUserId, form, manageableTeams, visibility]);

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createTask({
        organizationId: orgId,
        title: values.title,
        description: values.description || null,
        assignedTo: values.visibility === "private" ? currentUserId : values.assigned_to || null,
        dueDate: values.due_date || null,
        priority: values.priority,
        status: values.status,
        visibility: values.visibility,
        teamId: values.visibility === "team" ? values.team_id || null : null
      });

      if (result.error || !result.task) {
        form.setError("root", { message: result.error ?? "Could not create task." });
        return;
      }

      onTaskCreated(result.task);
      onOpenChange(false);
      form.reset({
        title: "",
        description: "",
        assigned_to: "",
        visibility: defaultVisibility,
        team_id: "",
        due_date: "",
        priority: "medium",
        status: defaultStatus
      });
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>
            Create a society task, assign something to your team, or keep a private todo just for yourself.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4 p-6 pt-2" onSubmit={onSubmit}>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} className="min-h-[110px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task type</FormLabel>
                    <FormControl>
                      <select {...field} className="flex h-10 w-full rounded-lg border border-border bg-[var(--surface)] px-3 text-sm">
                        {canManage ? <option value="organization">Society task</option> : null}
                        {canManage ? <option value="team">Team task</option> : null}
                        <option value="private">Private todo</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>
                    <FormControl>
                      <select {...field} disabled={visibility === "private"} className="flex h-10 w-full rounded-lg border border-border bg-[var(--surface)] px-3 text-sm">
                        <option value="">Unassigned</option>
                        {assignableMembers.map((member) => (
                          <option key={member.id} value={member.user_id}>
                            {member.user?.full_name ?? member.user?.email ?? "Unknown member"}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {visibility === "team" ? (
              <FormField
                control={form.control}
                name="team_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team</FormLabel>
                    <FormControl>
                      <select {...field} className="flex h-10 w-full rounded-lg border border-border bg-[var(--surface)] px-3 text-sm">
                        <option value="">Choose a team</option>
                        {manageableTeams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <select {...field} className="flex h-10 w-full rounded-lg border border-border bg-[var(--surface)] px-3 text-sm">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <select {...field} className="flex h-10 w-full rounded-lg border border-border bg-[var(--surface)] px-3 text-sm">
                        <option value="todo">Todo</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {form.formState.errors.root ? <p className="text-sm font-medium text-red-400">{form.formState.errors.root.message}</p> : null}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create task"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
