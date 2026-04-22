"use client";

import Link from "next/link";
import { useState } from "react";
import { Calendar, Clock3, Plus } from "lucide-react";

import type { MembershipRow, MeetingRow, UserRow } from "@/types";
import { CreateMeetingModal } from "@/components/meetings/CreateMeetingModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, truncateText } from "@/utils/format";

type MemberOption = MembershipRow & { user: UserRow | null };

type MeetingsWorkspaceProps = {
  upcoming: MeetingRow[];
  past: MeetingRow[];
  members: MemberOption[];
  orgId: string;
  currentUserId: string;
};

export function MeetingsWorkspace({ upcoming, past, members, orgId, currentUserId }: MeetingsWorkspaceProps) {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [createOpen, setCreateOpen] = useState(false);
  const [upcomingMeetings, setUpcomingMeetings] = useState(upcoming);
  const [pastMeetings, setPastMeetings] = useState(past);

  const meetings = tab === "upcoming" ? upcomingMeetings : pastMeetings;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex rounded-2xl border border-border bg-[var(--surface)] p-1">
            {[
              { key: "upcoming", label: "Upcoming" },
              { key: "past", label: "Past" }
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key as typeof tab)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  tab === item.key ? "bg-primary text-white" : "text-[var(--text-secondary)] hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New Meeting
          </Button>
        </div>

        <div className="grid gap-4">
          {meetings.map((meeting) => (
            <Card key={meeting.id}>
              <CardHeader className="pb-0">
                <CardTitle className="text-xl">{meeting.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)]">
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {meeting.start_time ? formatDateTime(meeting.start_time) : "No start time"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    {meeting.end_time ? formatDateTime(meeting.end_time) : "No end time"}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{truncateText(meeting.description ?? "No description yet.", 180)}</p>
                <Button asChild variant="outline">
                  <Link href={`/meetings/${meeting.id}`}>View details</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
          {!meetings.length ? (
            <div className="rounded-2xl border border-dashed border-border bg-[var(--surface)] px-6 py-10 text-center text-sm text-[var(--text-secondary)]">
              No {tab} meetings yet.
            </div>
          ) : null}
        </div>
      </div>

      <CreateMeetingModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        orgId={orgId}
        currentUserId={currentUserId}
        members={members}
        onMeetingCreated={(meeting) =>
          setUpcomingMeetings((current) => [meeting, ...current].sort((a, b) => new Date(a.start_time ?? 0).getTime() - new Date(b.start_time ?? 0).getTime()))
        }
      />
    </>
  );
}
