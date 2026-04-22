"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { MembershipRow, TaskRecord, UserRow } from "@/types";
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
  members: MemberOption[];
  defaultStatus?: "todo" | "in_progress" | "done";
  onTaskCreated: (task: TaskRecord) => void;
};

export function CreateTaskModal({
  open,
  onOpenChange,
  orgId,
  currentUserId,
  members,
  defaultStatus = "todo",
  onTaskCreated
}: CreateTaskModalProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const client = supabase as any;
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreateTaskValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      assigned_to: "",
      due_date: "",
      priority: "medium",
      status: defaultStatus
    }
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const taskInsert = await client
        .from("tasks")
        .insert({
          organization_id: orgId,
          title: values.title,
          description: values.description || null,
          assigned_to: values.assigned_to || null,
          created_by: currentUserId,
          due_date: values.due_date || null,
          priority: values.priority,
          status: values.status
        })
        .select(
          "id, organization_id, title, description, assigned_to, created_by, source_meeting_id, due_date, status, priority, recurring_rule, created_at, assignee:users(id, full_name, email, avatar_url)"
        )
        .single();

      if (taskInsert.error) {
        form.setError("root", { message: taskInsert.error.message });
        return;
      }

      await client.from("activity_logs").insert({
        organization_id: orgId,
        actor_user_id: currentUserId,
        action: "created a task",
        metadata: {
          task_id: taskInsert.data.id
        }
      });

      onTaskCreated(taskInsert.data as TaskRecord);
      onOpenChange(false);
      form.reset({
        title: "",
        description: "",
        assigned_to: "",
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
          <DialogDescription>Add a new task to the active organization.</DialogDescription>
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
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>
                    <FormControl>
                      <select {...field} className="flex h-10 w-full rounded-lg border border-border bg-[var(--surface)] px-3 text-sm">
                        <option value="">Unassigned</option>
                        {members.map((member) => (
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
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
