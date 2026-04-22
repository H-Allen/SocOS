"use client";

import { useState } from "react";
import { Megaphone, Pin, PinOff, Plus, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { canManageWorkspace, getInitials, isAdmin } from "@/lib/workspace";
import type { AnnouncementRecord, PermissionLevel, UserRow } from "@/types";
import { formatDateTime, formatRelativeTime } from "@/utils/format";

type AnnouncementsWorkspaceProps = {
  initialAnnouncements: AnnouncementRecord[];
  currentUser: UserRow;
  orgId: string;
  permissionLevel: PermissionLevel;
};

type AnnouncementForm = {
  title: string;
  content: string;
  pinned: boolean;
};

const EMPTY_FORM: AnnouncementForm = {
  title: "",
  content: "",
  pinned: false
};

export function AnnouncementsWorkspace({ initialAnnouncements, currentUser, orgId, permissionLevel }: AnnouncementsWorkspaceProps) {
  const supabase = createBrowserSupabaseClient();
  const client = supabase as any;
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [postOpen, setPostOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = canManageWorkspace(permissionLevel);
  const canDelete = isAdmin(permissionLevel);

  const orderedAnnouncements = [...announcements].sort((left, right) => {
    if ((left.pinned ?? false) !== (right.pinned ?? false)) {
      return left.pinned ? -1 : 1;
    }

    return new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime();
  });

  const createAnnouncement = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await client
      .from("announcements")
      .insert({
        organization_id: orgId,
        title: form.title.trim(),
        content: form.content.trim(),
        pinned: form.pinned,
        created_by: currentUser.id
      })
      .select("id, organization_id, title, content, pinned, created_by, created_at, author:users(id, full_name, email, avatar_url)")
      .single();

    if (!error && data) {
      setAnnouncements((current) => [data as AnnouncementRecord, ...current]);
      await client.from("activity_logs").insert({
        organization_id: orgId,
        actor_user_id: currentUser.id,
        action: "posted an announcement",
        metadata: {
          announcement_id: data.id,
          title: data.title
        }
      });
      setForm(EMPTY_FORM);
      setPostOpen(false);
    }

    setIsSubmitting(false);
  };

  const togglePin = async (announcement: AnnouncementRecord) => {
    const nextPinned = !announcement.pinned;
    const { error } = await client.from("announcements").update({ pinned: nextPinned }).eq("id", announcement.id);

    if (!error) {
      setAnnouncements((current) => current.map((entry) => (entry.id === announcement.id ? { ...entry, pinned: nextPinned } : entry)));
      await client.from("activity_logs").insert({
        organization_id: orgId,
        actor_user_id: currentUser.id,
        action: nextPinned ? "pinned an announcement" : "unpinned an announcement",
        metadata: {
          announcement_id: announcement.id,
          title: announcement.title
        }
      });
    }
  };

  const deleteAnnouncement = async (announcementId: string) => {
    const { error } = await client.from("announcements").delete().eq("id", announcementId);

    if (!error) {
      await client.from("activity_logs").insert({
        organization_id: orgId,
        actor_user_id: currentUser.id,
        action: "deleted an announcement",
        metadata: {
          announcement_id: announcementId
        }
      });
      setAnnouncements((current) => current.filter((entry) => entry.id !== announcementId));
    }
  };

  return (
    <div className="space-y-6">
      <section className="surface-card overflow-hidden rounded-[28px]">
        <div className="flex flex-col gap-6 p-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Shared updates</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">Announcements</h1>
            <p className="mt-3 max-w-2xl text-base text-[var(--text-secondary)]">
              Publish important updates without burying them in chat threads or expecting everyone to notice a message at the right moment.
            </p>
          </div>
          {canManage ? (
            <Button onClick={() => setPostOpen(true)}>
              <Plus className="h-4 w-4" />
              Post Announcement
            </Button>
          ) : null}
        </div>
      </section>

      <section className="space-y-5">
        {orderedAnnouncements.map((announcement) => {
          const content = announcement.content ?? "";
          const collapsed = content.length > 300 && !expanded.includes(announcement.id);

          return (
            <article key={announcement.id} className="rounded-[24px] border border-border bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-semibold text-foreground">{announcement.title}</h2>
                    {announcement.pinned ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                        <Pin className="h-3 w-3" />
                        Pinned
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={announcement.author?.avatar_url ?? undefined} alt={announcement.author?.full_name ?? announcement.author?.email ?? "Author"} />
                      <AvatarFallback>{getInitials(announcement.author?.full_name ?? null, announcement.author?.email ?? null)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{announcement.author?.full_name ?? announcement.author?.email ?? "Committee member"}</p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        Posted {formatRelativeTime(announcement.created_at)} · {formatDateTime(announcement.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {canManage ? (
                    <Button variant="outline" onClick={() => void togglePin(announcement)}>
                      {announcement.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      {announcement.pinned ? "Unpin" : "Pin"}
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button variant="ghost" size="icon" onClick={() => void deleteAnnouncement(announcement.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-border bg-[var(--surface)] p-5">
                <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">{collapsed ? `${content.slice(0, 300).trimEnd()}...` : content}</p>
                {content.length > 300 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((current) => (current.includes(announcement.id) ? current.filter((value) => value !== announcement.id) : [...current, announcement.id]))
                    }
                    className="mt-3 text-sm font-medium text-primary"
                  >
                    {expanded.includes(announcement.id) ? "Show less" : "Read more"}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>

      <Dialog open={postOpen} onOpenChange={setPostOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post Announcement</DialogTitle>
            <DialogDescription>Share an update with the whole organization.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-6 pt-2">
            <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Title" />
            <Textarea value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} placeholder="Announcement content" className="min-h-[180px]" />
            <label className="flex items-center gap-3 rounded-2xl border border-border bg-[var(--surface-2)] px-4 py-3 text-sm text-foreground">
              <input type="checkbox" checked={form.pinned} onChange={(event) => setForm((current) => ({ ...current, pinned: event.target.checked }))} />
              Pin this announcement to the top of the feed
            </label>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setPostOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void createAnnouncement()} disabled={isSubmitting || !form.title.trim() || !form.content.trim()}>
                {isSubmitting ? "Posting..." : "Post"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
