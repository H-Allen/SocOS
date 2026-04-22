"use client";

import { useMemo, useState } from "react";
import { Calendar as BigCalendar, Views, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enGB } from "date-fns/locale";
import { CalendarPlus, Clock3, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

import { TaskDetailDrawer } from "@/components/tasks/TaskDetailDrawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { canManageWorkspace, getInitials } from "@/lib/workspace";
import type { EventRow, MeetingRow, MemberRecord, PermissionLevel, TaskRecord } from "@/types";
import { formatDateTime } from "@/utils/format";

const locales = {
  "en-GB": enGB
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales
});

type CalendarWorkspaceProps = {
  meetings: MeetingRow[];
  tasks: TaskRecord[];
  events: EventRow[];
  members: MemberRecord[];
  orgId: string;
  currentUserId: string;
  permissionLevel: PermissionLevel;
};

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  source: "meeting" | "task" | "event";
  meeting?: MeetingRow;
  task?: TaskRecord;
  event?: EventRow;
};

type EventForm = {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
};

const EMPTY_EVENT_FORM: EventForm = {
  title: "",
  description: "",
  startTime: "",
  endTime: "",
  location: ""
};

export function CalendarWorkspace({ meetings, tasks, events, members, orgId, currentUserId, permissionLevel }: CalendarWorkspaceProps) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const client = supabase as any;
  const [calendarEvents, setCalendarEvents] = useState<EventRow[]>(events);
  const [calendarTasks, setCalendarTasks] = useState(tasks);
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [eventForm, setEventForm] = useState<EventForm>(EMPTY_EVENT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = canManageWorkspace(permissionLevel);

  const eventItems = useMemo<CalendarEvent[]>(() => {
    const meetingItems = meetings
      .filter((meeting) => meeting.start_time)
      .map((meeting) => ({
        id: `meeting-${meeting.id}`,
        title: meeting.title,
        start: new Date(meeting.start_time!),
        end: new Date(meeting.end_time ?? meeting.start_time!),
        source: "meeting" as const,
        meeting
      }));

    const taskItems = calendarTasks
      .filter((task) => task.due_date)
      .map((task) => ({
        id: `task-${task.id}`,
        title: task.title,
        start: new Date(`${task.due_date}T09:00:00`),
        end: new Date(`${task.due_date}T17:00:00`),
        allDay: true,
        source: "task" as const,
        task
      }));

    const customEvents = calendarEvents
      .filter((event) => event.start_time)
      .map((event) => ({
        id: `event-${event.id}`,
        title: event.title,
        start: new Date(event.start_time!),
        end: new Date(event.end_time ?? event.start_time!),
        source: "event" as const,
        event
      }));

    return [...meetingItems, ...taskItems, ...customEvents];
  }, [calendarEvents, calendarTasks, meetings]);

  const createEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.startTime) {
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await client
      .from("events")
      .insert({
        organization_id: orgId,
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || null,
        start_time: new Date(eventForm.startTime).toISOString(),
        end_time: eventForm.endTime ? new Date(eventForm.endTime).toISOString() : new Date(eventForm.startTime).toISOString(),
        location: eventForm.location.trim() || null
      })
      .select("*")
      .single();

    if (!error && data) {
      setCalendarEvents((current) => [...current, data as EventRow]);
      await client.from("activity_logs").insert({
        organization_id: orgId,
        actor_user_id: currentUserId,
        action: "created an event",
        metadata: {
          event_id: data.id,
          event_title: data.title
        }
      });
      setEventForm(EMPTY_EVENT_FORM);
      setAddOpen(false);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <section className="surface-card overflow-hidden rounded-[28px]">
        <div className="flex flex-col gap-6 p-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Shared schedule</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">Calendar</h1>
            <p className="mt-3 max-w-2xl text-base text-[var(--text-secondary)]">
              Keep meetings, deadlines, and custom events in one timeline so nothing important sneaks past the committee.
            </p>
          </div>
          {canManage ? (
            <Button onClick={() => setAddOpen(true)}>
              <CalendarPlus className="h-4 w-4" />
              Add Event
            </Button>
          ) : null}
        </div>
      </section>

      <section className="rounded-[28px] border border-border bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-5">
        <div className="calendar-shell h-[780px]">
          <BigCalendar
            localizer={localizer}
            events={eventItems}
            defaultView={Views.MONTH}
            views={[Views.MONTH, Views.WEEK]}
            popup
            onSelectEvent={(item) => {
              if (item.source === "meeting" && item.meeting) {
                router.push(`/meetings/${item.meeting.id}`);
                return;
              }

              if (item.source === "task" && item.task) {
                setSelectedTask(item.task);
                return;
              }

              if (item.source === "event" && item.event) {
                setSelectedEvent(item.event);
              }
            }}
            eventPropGetter={(event) => {
              const backgroundColor = event.source === "meeting" ? "rgba(59, 130, 246, 0.18)" : event.source === "task" ? "rgba(245, 158, 11, 0.22)" : "rgba(168, 85, 247, 0.2)";
              const borderColor = event.source === "meeting" ? "#3b82f6" : event.source === "task" ? "#f59e0b" : "#a855f7";

              return {
                style: {
                  backgroundColor,
                  border: `1px solid ${borderColor}`,
                  color: "#111118",
                  borderRadius: "14px",
                  padding: "2px 8px"
                }
              };
            }}
          />
        </div>
      </section>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Event</DialogTitle>
            <DialogDescription>Create a custom event for the organization calendar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-6 pt-2">
            <Input value={eventForm.title} onChange={(event) => setEventForm((current) => ({ ...current, title: event.target.value }))} placeholder="Event title" />
            <Input value={eventForm.location} onChange={(event) => setEventForm((current) => ({ ...current, location: event.target.value }))} placeholder="Location" />
            <textarea
              value={eventForm.description}
              onChange={(event) => setEventForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Description"
              className="min-h-[120px] w-full rounded-lg border border-border bg-[var(--surface)] px-3 py-2.5 text-sm text-foreground placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input type="datetime-local" value={eventForm.startTime} onChange={(event) => setEventForm((current) => ({ ...current, startTime: event.target.value }))} />
              <Input type="datetime-local" value={eventForm.endTime} onChange={(event) => setEventForm((current) => ({ ...current, endTime: event.target.value }))} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void createEvent()} disabled={isSubmitting || !eventForm.title.trim() || !eventForm.startTime}>
                {isSubmitting ? "Saving..." : "Create event"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedEvent)} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent>
          {selectedEvent ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedEvent.title}</DialogTitle>
                <DialogDescription>{selectedEvent.description ?? "No description provided."}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 p-6 pt-2">
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-[var(--surface-2)] px-4 py-3">
                  <Clock3 className="h-4 w-4 text-[var(--text-secondary)]" />
                  <span className="text-sm text-foreground">
                    {selectedEvent.start_time ? formatDateTime(selectedEvent.start_time) : "No start time"}
                    {selectedEvent.end_time ? ` to ${formatDateTime(selectedEvent.end_time)}` : ""}
                  </span>
                </div>
                {selectedEvent.location ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-[var(--surface-2)] px-4 py-3">
                    <MapPin className="h-4 w-4 text-[var(--text-secondary)]" />
                    <span className="text-sm text-foreground">{selectedEvent.location}</span>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <TaskDetailDrawer
        open={Boolean(selectedTask)}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        task={selectedTask}
        members={members}
        orgId={orgId}
        currentUserId={currentUserId}
        canDelete={canManage}
        onTaskUpdated={(task) => {
          setCalendarTasks((current) => current.map((entry) => (entry.id === task.id ? task : entry)));
          setSelectedTask(task);
        }}
        onTaskDeleted={(taskId) => {
          setCalendarTasks((current) => current.filter((entry) => entry.id !== taskId));
          setSelectedTask(null);
        }}
      />
    </div>
  );
}
