"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, Download, Plus, Save, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("react-simple-wysiwyg").then((mod) => mod.default), { ssr: false });

import { createBrowserBackendClient } from "@/lib/backend/client";
import type { MeetingWithDetails, MembershipRow, TaskRecord, UserRow } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatRelativeTime, truncateText } from "@/utils/format";

type MemberOption = MembershipRow & { user: UserRow | null };

type MeetingDetailClientProps = {
  meeting: MeetingWithDetails;
  members: MemberOption[];
  actionItems: TaskRecord[];
  currentUserId: string;
  orgId: string;
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

export function MeetingDetailClient({ meeting, members, actionItems: initialActionItems, currentUserId, orgId }: MeetingDetailClientProps) {
  const backend = useMemo(() => createBrowserBackendClient(), []);
  const client = backend as any;
  const [editableMeeting, setEditableMeeting] = useState(meeting);
  const [notes, setNotes] = useState(meeting.notes[0]?.content ?? "");
  const [lastSaved, setLastSaved] = useState<string | null>(meeting.notes[0]?.updated_at ?? meeting.notes[0]?.created_at ?? null);
  const [agendaItems, setAgendaItems] = useState(meeting.agendaItems);
  const [newAgendaItem, setNewAgendaItem] = useState("");
  const [attendees, setAttendees] = useState(meeting.attendees);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [actionItems, setActionItems] = useState(initialActionItems);
  const [taskTitle, setTaskTitle] = useState("");
  const [isEditingHeader, setIsEditingHeader] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      const existingNote = editableMeeting.notes[0];
      if (existingNote?.content === notes) {
        return;
      }

      if (existingNote) {
        const savedAt = new Date().toISOString();
        const result = await client
          .from("meeting_notes")
          .update({ content: notes, updated_by: currentUserId, updated_at: savedAt })
          .eq("id", existingNote.id)
          .select("*")
          .single();

        if (!result.error) {
          setEditableMeeting((current) => ({ ...current, notes: [result.data, ...current.notes.slice(1)] }));
          setLastSaved(result.data.updated_at ?? savedAt);
        }
      } else if (notes.trim()) {
        const savedAt = new Date().toISOString();
        const result = await client
          .from("meeting_notes")
          .insert({ meeting_id: editableMeeting.id, content: notes, updated_by: currentUserId, updated_at: savedAt })
          .select("*")
          .single();

        if (!result.error) {
          setEditableMeeting((current) => ({ ...current, notes: [result.data] }));
          setLastSaved(result.data.updated_at ?? result.data.created_at ?? savedAt);
        }
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, [client, currentUserId, editableMeeting.id, editableMeeting.notes, notes]);

  const saveHeader = async () => {
    const result = await client
      .from("meetings")
      .update({
        title: editableMeeting.title,
        description: editableMeeting.description,
        start_time: editableMeeting.start_time,
        end_time: editableMeeting.end_time
      })
      .eq("id", editableMeeting.id)
      .select("*")
      .single();

    if (!result.error) {
      setEditableMeeting((current) => ({ ...current, ...result.data }));
      setIsEditingHeader(false);
      await client.from("activity_logs").insert({
        organization_id: orgId,
        actor_user_id: currentUserId,
        action: "updated a meeting",
        metadata: {
          meeting_id: editableMeeting.id
        }
      });
    }
  };

  const addAttendee = async () => {
    if (!selectedMemberId) {
      return;
    }

    const result = await client
      .from("meeting_attendees")
      .insert({ meeting_id: editableMeeting.id, user_id: selectedMemberId })
      .select("id, meeting_id, user_id, created_at, user:users(*)")
      .single();

    if (!result.error) {
      setAttendees((current) => [...current, result.data]);
      setSelectedMemberId("");
    }
  };

  const removeAttendee = async (attendeeId: string) => {
    await client.from("meeting_attendees").delete().eq("id", attendeeId);
    setAttendees((current) => current.filter((attendee) => attendee.id !== attendeeId));
  };

  const addAgendaItem = async () => {
    if (!newAgendaItem.trim()) {
      return;
    }

    const result = await client
      .from("meeting_agenda_items")
      .insert({
        meeting_id: editableMeeting.id,
        content: newAgendaItem,
        position: agendaItems.length
      })
      .select("*")
      .single();

    if (!result.error) {
      setAgendaItems((current) => [...current, result.data]);
      setNewAgendaItem("");
    }
  };

  const moveAgendaItem = async (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= agendaItems.length) {
      return;
    }

    const nextItems = [...agendaItems];
    [nextItems[index], nextItems[nextIndex]] = [nextItems[nextIndex], nextItems[index]];
    const normalized = nextItems.map((item, position) => ({ ...item, position }));
    setAgendaItems(normalized);

    await Promise.all(
      normalized.map((item) =>
        client.from("meeting_agenda_items").update({ position: item.position }).eq("id", item.id)
      )
    );
  };

  const deleteAgendaItem = async (id: string) => {
    await client.from("meeting_agenda_items").delete().eq("id", id);
    setAgendaItems((current) => current.filter((item) => item.id !== id).map((item, index) => ({ ...item, position: index })));
  };

  const createTaskFromNote = async () => {
    if (!taskTitle.trim()) {
      return;
    }

    const result = await client
      .from("tasks")
      .insert({
        organization_id: orgId,
        title: taskTitle,
        description: truncateText(notes.replace(/<[^>]+>/g, " "), 240),
        created_by: currentUserId,
        visibility: "organization",
        team_id: null,
        team_lead_user_id: null,
        source_meeting_id: editableMeeting.id,
        status: "todo",
        priority: "medium"
      })
      .select(
        "id, organization_id, title, description, assigned_to, created_by, source_meeting_id, due_date, status, priority, recurring_rule, created_at, assignee:users!tasks_assigned_to_fkey(id, full_name, email, avatar_url)"
      )
      .single();

    if (!result.error) {
      setActionItems((current) => [result.data, ...current]);
      setTaskTitle("");
      await client.from("activity_logs").insert({
        organization_id: orgId,
        actor_user_id: currentUserId,
        action: "created an action item from meeting notes",
        metadata: {
          meeting_id: editableMeeting.id,
          task_id: result.data.id
        }
      });
    }
  };

  const exportMinutes = () => {
    const markdown = `# ${editableMeeting.title}

Date: ${editableMeeting.start_time ? formatDateTime(editableMeeting.start_time) : "TBC"}

## Description
${editableMeeting.description ?? ""}

## Attendees
${attendees.map((attendee) => `- ${attendee.user?.full_name ?? attendee.user?.email ?? "Unknown member"}`).join("\n")}

## Agenda
${agendaItems.map((item) => `1. ${item.content}`).join("\n")}

## Notes
${notes.replace(/<[^>]+>/g, "")}

## Action Items
${actionItems.map((task) => `- ${task.title}`).join("\n")}
`;

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${editableMeeting.title.replace(/\s+/g, "-").toLowerCase()}-minutes.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-3">
              {isEditingHeader ? (
                <Input value={editableMeeting.title} onChange={(event) => setEditableMeeting({ ...editableMeeting, title: event.target.value })} />
              ) : (
                <CardTitle className="text-3xl">{editableMeeting.title}</CardTitle>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)]">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {editableMeeting.start_time ? formatDateTime(editableMeeting.start_time) : "No start time"}
                </span>
              </div>
              {isEditingHeader ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input type="datetime-local" value={editableMeeting.start_time ? editableMeeting.start_time.slice(0, 16) : ""} onChange={(event) => setEditableMeeting({ ...editableMeeting, start_time: event.target.value ? new Date(event.target.value).toISOString() : null })} />
                  <Input type="datetime-local" value={editableMeeting.end_time ? editableMeeting.end_time.slice(0, 16) : ""} onChange={(event) => setEditableMeeting({ ...editableMeeting, end_time: event.target.value ? new Date(event.target.value).toISOString() : null })} />
                </div>
              ) : null}
              {isEditingHeader ? (
                <Textarea value={editableMeeting.description ?? ""} onChange={(event) => setEditableMeeting({ ...editableMeeting, description: event.target.value })} />
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">{editableMeeting.description ?? "No description yet."}</p>
              )}
            </div>
            <Button onClick={isEditingHeader ? saveHeader : () => setIsEditingHeader(true)}>
              <Save className="h-4 w-4" />
              {isEditingHeader ? "Save" : "Edit"}
            </Button>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Agenda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-3">
              {agendaItems.map((item, index) => (
                <li key={item.id} className="flex items-center gap-3 rounded-2xl border border-border bg-[var(--surface-2)] px-4 py-3">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">{index + 1}.</span>
                  <span className="flex-1 text-sm text-foreground">{item.content}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => moveAgendaItem(index, -1)}>
                      Up
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => moveAgendaItem(index, 1)}>
                      Down
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteAgendaItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
            <div className="flex gap-3">
              <Input value={newAgendaItem} onChange={(event) => setNewAgendaItem(event.target.value)} placeholder="Add agenda item" />
              <Button onClick={addAgendaItem}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-white text-[#111118] [&_.rsw-editor]:min-h-[260px] [&_.rsw-editor]:border-0 [&_.rsw-toolbar]:border-b [&_.rsw-toolbar]:border-[#e4e4ec]">
              <Editor value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
            <p className="text-xs text-[var(--text-muted)]">Last saved {lastSaved ? formatRelativeTime(lastSaved) : "not yet"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Attendees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {attendees.map((attendee) => (
                <button key={attendee.id} type="button" onClick={() => removeAttendee(attendee.id)} className="inline-flex items-center gap-2 rounded-full border border-border bg-[var(--surface-2)] px-3 py-2 text-sm">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={attendee.user?.avatar_url ?? undefined} alt={attendee.user?.full_name ?? attendee.user?.email ?? "Attendee"} />
                    <AvatarFallback>{getInitials(attendee.user?.full_name ?? null, attendee.user?.email ?? null)}</AvatarFallback>
                  </Avatar>
                  {attendee.user?.full_name ?? attendee.user?.email ?? "Unknown member"}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <select value={selectedMemberId} onChange={(event) => setSelectedMemberId(event.target.value)} className="flex h-10 flex-1 rounded-lg border border-border bg-[var(--surface)] px-3 text-sm">
                <option value="">Select member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.user_id}>
                    {member.user?.full_name ?? member.user?.email ?? "Unknown member"}
                  </option>
                ))}
              </select>
              <Button onClick={addAttendee}>Add</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Action items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Create task from note" />
              <Button onClick={createTaskFromNote}>Create task from note</Button>
            </div>
            <div className="space-y-3">
              {actionItems.map((task) => (
                <Link key={task.id} href="/tasks" className="block rounded-2xl border border-border bg-[var(--surface-2)] px-4 py-3 transition-colors hover:bg-[var(--surface)]">
                  <p className="text-sm font-medium text-foreground">{task.title}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{task.status?.replace("_", " ") ?? "todo"}</p>
                </Link>
              ))}
              {!actionItems.length ? <p className="text-sm text-[var(--text-secondary)]">No action items created from this meeting yet.</p> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Export</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={exportMinutes}>
              <Download className="h-4 w-4" />
              Export minutes
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
