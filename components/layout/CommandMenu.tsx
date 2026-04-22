"use client";

import { useEffect, useMemo, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { BookOpen, Calendar, CheckSquare, FileText, FolderOpen, Search, Users } from "lucide-react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useOrg } from "@/lib/org-context";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { HandoverRow, MeetingRow, MembershipRow, ResourceRow, TaskRow, UserRow } from "@/types";

type CommandMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type SearchResults = {
  tasks: TaskRow[];
  meetings: MeetingRow[];
  resources: ResourceRow[];
  handovers: HandoverRow[];
  members: Array<MembershipRow & { user: Pick<UserRow, "id" | "full_name" | "email" | "avatar_url"> | null }>;
};

const emptyResults: SearchResults = {
  tasks: [],
  meetings: [],
  resources: [],
  handovers: [],
  members: []
};

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter();
  const { currentOrg } = useOrg();
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange, open]);

  useEffect(() => {
    if (!open || !currentOrg) {
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const orgId = currentOrg.id;

    async function fetchResults() {
      setLoading(true);

      const [tasks, meetings, resources, handovers, members] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, organization_id, title, description, assigned_to, created_by, due_date, status, priority, recurring_rule, created_at")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("meetings")
          .select("id, organization_id, title, description, start_time, end_time, created_by, created_at")
          .eq("organization_id", orgId)
          .order("start_time", { ascending: true })
          .limit(5),
        supabase
          .from("resources")
          .select("id, organization_id, title, description, type, file_url, external_url, tags, uploaded_by, created_at")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("handovers")
          .select("id, organization_id, role_name, responsibilities, annual_timeline, key_contacts, advice, mistakes, checklist, updated_at")
          .eq("organization_id", orgId)
          .order("updated_at", { ascending: false })
          .limit(5),
        supabase
          .from("memberships")
          .select("id, user_id, organization_id, role, permission_level, joined_at, user:users(id, full_name, email, avatar_url)")
          .eq("organization_id", orgId)
          .order("joined_at", { ascending: true })
          .limit(5)
      ]);

      setResults({
        tasks: (tasks.data as TaskRow[] | null) ?? [],
        meetings: (meetings.data as MeetingRow[] | null) ?? [],
        resources: (resources.data as ResourceRow[] | null) ?? [],
        handovers: (handovers.data as HandoverRow[] | null) ?? [],
        members:
          (members.data as Array<
            MembershipRow & { user: Pick<UserRow, "id" | "full_name" | "email" | "avatar_url"> | null }
          > | null) ?? []
      });

      setLoading(false);
    }

    void fetchResults();
  }, [currentOrg, open]);

  const totalResults = useMemo(
    () =>
      results.tasks.length +
      results.members.length +
      results.meetings.length +
      results.resources.length +
      results.handovers.length,
    [results]
  );

  const navigate = (href: string) => {
    onOpenChange(false);
    router.push(href as Route);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Global search</DialogTitle>
          <DialogDescription>Search the current organization across tasks, meetings, members, resources, and handovers.</DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput placeholder={currentOrg ? `Search ${currentOrg.name}` : "Search workspace"} />
          <CommandList>
            <CommandEmpty>{loading ? "Loading results..." : "No matching results in this organization yet."}</CommandEmpty>
            {totalResults > 0 || loading ? (
              <>
                <CommandGroup heading="Tasks">
                  {results.tasks.map((task) => (
                    <CommandItem key={task.id} onSelect={() => navigate(`/tasks?task=${task.id}`)}>
                      <CheckSquare className="h-4 w-4 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                        <p className="truncate text-xs text-[var(--text-secondary)]">
                          {task.status ? task.status.replace("_", " ") : "No status"}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Members">
                  {results.members.map((member) => (
                    <CommandItem key={member.id} onSelect={() => navigate(`/members?member=${member.user_id}`)}>
                      <Users className="h-4 w-4 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {member.user?.full_name ?? member.user?.email ?? "Unnamed member"}
                        </p>
                        <p className="truncate text-xs text-[var(--text-secondary)]">{member.role}</p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Meetings">
                  {results.meetings.map((meeting) => (
                    <CommandItem key={meeting.id} onSelect={() => navigate(`/meetings?meeting=${meeting.id}`)}>
                      <Calendar className="h-4 w-4 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{meeting.title}</p>
                        <p className="truncate text-xs text-[var(--text-secondary)]">
                          {meeting.start_time ? new Date(meeting.start_time).toLocaleString("en-GB") : "No date set"}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Resources">
                  {results.resources.map((resource) => (
                    <CommandItem key={resource.id} onSelect={() => navigate(`/resources?resource=${resource.id}`)}>
                      <FolderOpen className="h-4 w-4 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{resource.title}</p>
                        <p className="truncate text-xs text-[var(--text-secondary)]">{resource.type}</p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Handovers">
                  {results.handovers.map((handover) => (
                    <CommandItem key={handover.id} onSelect={() => navigate(`/handovers?handover=${handover.id}`)}>
                      <BookOpen className="h-4 w-4 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{handover.role_name}</p>
                        <p className="truncate text-xs text-[var(--text-secondary)]">Operational handover</p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
          <div className="flex items-center gap-2 border-t border-border px-4 py-3 text-xs text-[var(--text-muted)]">
            <Search className="h-3.5 w-3.5" />
            Search is scoped to the active organization
            <CommandShortcut>⌘K</CommandShortcut>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
