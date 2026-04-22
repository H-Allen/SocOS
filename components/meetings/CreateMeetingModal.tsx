"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { MembershipRow, MeetingRow, UserRow } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type MemberOption = MembershipRow & { user: UserRow | null };

const createMeetingSchema = z
  .object({
    title: z.string().min(1, "Title is required."),
    description: z.string().optional(),
    start_time: z.string().min(1, "Start time is required."),
    end_time: z.string().min(1, "End time is required."),
    invitedMembers: z.array(z.string()).default([])
  })
  .refine((value) => new Date(value.end_time) > new Date(value.start_time), {
    message: "End time must be after start time.",
    path: ["end_time"]
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
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const client = supabase as any;
  const [isPending, startTransition] = useTransition();
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const router = useRouter();

  const form = useForm<CreateMeetingValues>({
    resolver: zodResolver(createMeetingSchema),
    defaultValues: {
      title: "",
      description: "",
      start_time: "",
      end_time: "",
      invitedMembers: []
    }
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const meetingInsert = await client
        .from("meetings")
        .insert({
          organization_id: orgId,
          title: values.title,
          description: values.description || null,
          start_time: new Date(values.start_time).toISOString(),
          end_time: new Date(values.end_time).toISOString(),
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
      router.refresh();
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create meeting</DialogTitle>
          <DialogDescription>Schedule a meeting for the current organization.</DialogDescription>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="space-y-2">
              <FormLabel>Invite members</FormLabel>
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
