"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";

import { createBrowserBackendClient } from "@/lib/backend/client";
import type { MembershipRow, MeetingRow, UserRow } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type MemberOption = MembershipRow & { user: UserRow | null };

const createMeetingSchema = z
  .object({
    title: z.string().min(1, "Title is required."),
    description: z.string().optional(),
    start_time: z.string().optional(),
    duration: z.string().optional(),
    invitedMembers: z.array(z.string()).default([])
  });

type CreateMeetingValues = z.infer<typeof createMeetingSchema>;

type CreateMeetingModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  currentUserId: string;
  members: MemberOption[];
  onMeetingCreated: (meeting: MeetingRow) => void;
};

export function CreateMeetingModal({ open, onOpenChange, orgId, currentUserId, members, onMeetingCreated }: CreateMeetingModalProps) {
  const backend = useMemo(() => createBrowserBackendClient(), []);
  const client = backend as any;
  const [isPending, startTransition] = useTransition();
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const router = useRouter();

  const form = useForm<CreateMeetingValues>({
    resolver: zodResolver(createMeetingSchema),
    defaultValues: {
      title: "",
      description: "",
      start_time: "",
      duration: "",
      invitedMembers: []
    }
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      let start: Date | null = null;
      let end: Date | null = null;

      if (values.start_time) {
        start = new Date(values.start_time);
        end = new Date(start.getTime());
        if (values.duration) {
          end.setMinutes(end.getMinutes() + parseInt(values.duration, 10));
        } else {
          end.setHours(end.getHours() + 1);
        }
      }

      const meetingInsert = await client
        .from("meetings")
        .insert({
          organization_id: orgId,
          title: values.title,
          description: values.description || null,
          start_time: start ? start.toISOString() : null,
          end_time: end ? end.toISOString() : null,
          created_by: currentUserId
        })
        .select("*")
        .single();

      if (meetingInsert.error) {
        form.setError("root", { message: meetingInsert.error.message });
        return;
      }

      if (selectedMembers.length) {
        await client.from("meeting_attendees").insert(selectedMembers.map((userId) => ({ meeting_id: meetingInsert.data.id, user_id: userId })));
      }

      await client.from("activity_logs").insert({
        organization_id: orgId,
        actor_user_id: currentUserId,
        action: "scheduled a meeting",
        metadata: {
          meeting_id: meetingInsert.data.id
        }
      });

      onMeetingCreated(meetingInsert.data as MeetingRow);
      onOpenChange(false);
      setSelectedMembers([]);
      form.reset({
        title: "",
        description: "",
        start_time: "",
        duration: "",
        invitedMembers: []
      });
      router.refresh();
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
          <DialogHeader>
          <DialogTitle>Create meeting</DialogTitle>
          <DialogDescription>Add the purpose now. Start time and duration are optional if you are still planning.</DialogDescription>
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
                    <Textarea {...field} value={field.value ?? ""} className="min-h-[100px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="rounded-2xl border border-border bg-[var(--surface-2)] p-4">
              <div className="mb-3">
                <p className="text-sm font-semibold text-foreground">Scheduling</p>
                <p className="text-sm text-[var(--text-secondary)]">Leave blank to create an unscheduled planning meeting.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start time (Optional)</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (Optional)</FormLabel>
                    <FormControl>
                      <select {...field} value={field.value ?? ""} className="flex h-10 w-full rounded-lg border border-border bg-[var(--surface)] px-3 text-sm">
                        <option value="">Default to 1 hour</option>
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="90">1.5 hours</option>
                        <option value="120">2 hours</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Invite members</Label>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-2xl border border-border bg-[var(--surface-2)] p-3">
                {members.map((member) => {
                  const active = selectedMembers.includes(member.user_id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() =>
                        setSelectedMembers((current) =>
                          active ? current.filter((value) => value !== member.user_id) : [...current, member.user_id]
                        )
                      }
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                        active ? "bg-primary text-white" : "bg-[var(--surface)] text-foreground"
                      }`}
                    >
                      <span>{member.user?.full_name ?? member.user?.email ?? "Unknown member"}</span>
                      <span className="text-xs opacity-80">{member.role}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {form.formState.errors.root ? <p className="text-sm font-medium text-red-400">{form.formState.errors.root.message}</p> : null}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create meeting"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
