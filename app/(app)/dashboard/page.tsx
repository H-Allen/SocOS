import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, Target, Zap } from "lucide-react";
import { redirect } from "next/navigation";

import { Navbar } from "@/components/layout/Navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerActiveOrganization } from "@/lib/org-server";
import {
  getCurrentUser,
  getDashboardAnnouncements,
  getDashboardTasks,
  getHealthCounts,
  getRecentActivity,
  getUpcomingMeetings,
  getUserMemberships
} from "@/lib/supabase/queries";
import { formatDate, formatDateTime, formatLongDate, formatRelativeTime, getTimeBasedGreeting, truncateText } from "@/utils/format";
import { cn } from "@/utils/cn";

function getInitials(name: string | null, email: string | null) {
  const value = name ?? email ?? "User";

  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatOrgType(value: string | null) {
  if (!value) {
    return "Organization";
  }

  return value
    .split("_")
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(" ");
}

function priorityColor(priority: string | null) {
  if (priority === "high") {
    return "bg-red-500";
  }

  if (priority === "medium") {
    return "bg-amber-400";
  }

  return "bg-emerald-500";
}

export default async function DashboardPage() {
  const [user, memberships] = await Promise.all([getCurrentUser(), getUserMemberships()]);

  if (!user) {
    redirect("/login");
  }

  if (!memberships.length) {
    redirect("/onboarding");
  }

  const currentOrg = getServerActiveOrganization(memberships);

  if (!currentOrg) {
    redirect("/onboarding");
  }

  const [myTasks, upcomingMeetings, recentActivity, announcements, health] = await Promise.all([
    getDashboardTasks(currentOrg.id, user.id),
    getUpcomingMeetings(currentOrg.id),
    getRecentActivity(currentOrg.id),
    getDashboardAnnouncements(currentOrg.id),
    getHealthCounts(currentOrg.id)
  ]);

  const greeting = getTimeBasedGreeting();
  const today = formatLongDate(new Date());
  const healthy = health.overdueTasks === 0 && health.missingHandovers === 0;

  return (
    <div className="min-h-screen">
      <Navbar title="Dashboard" user={user} />
      <div className="bg-grid min-h-[calc(100vh-5rem)] px-6 py-6">
        <div className="grid gap-6 xl:grid-cols-12">
          <section className="xl:col-span-12">
            <div className="surface-card overflow-hidden rounded-[28px]">
              <div className="flex flex-col gap-6 p-8 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">{greeting}</p>
                  <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">{user.full_name ? `${greeting}, ${user.full_name.split(" ")[0]}` : greeting}</h1>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="text-lg font-medium text-foreground">{currentOrg.name}</span>
                    <span className="rounded-full border border-border bg-[var(--surface)] px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                      {formatOrgType(currentOrg.type)}
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-[var(--surface)] px-4 py-3 text-right">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">Today</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{today}</p>
                </div>
              </div>
            </div>
          </section>

          <div className="space-y-6 xl:col-span-8">
            <Card className="bg-[var(--surface)] p-0">
              <CardHeader className="flex flex-row items-center justify-between p-6 pb-0">
                <div>
                  <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">My Tasks</p>
                  <CardTitle className="text-2xl">Focus queue</CardTitle>
                </div>
                <Link href="/tasks" className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-[var(--accent-hover)]">
                  View all tasks
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </CardHeader>
              <CardContent className="p-6">
                {myTasks.length ? (
                  <div className="divide-y divide-border">
                    {myTasks.map((task) => {
                      const isOverdue = Boolean(task.due_date && new Date(task.due_date) < new Date());

                      return (
                        <div key={task.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                          <span className={cn("h-2.5 w-2.5 rounded-full", priorityColor(task.priority))} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                              <span className={cn(isOverdue && "font-medium text-red-400")}>
                                {task.due_date ? `Due ${formatDate(task.due_date)}` : "No due date"}
                              </span>
                              <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 capitalize text-[var(--text-secondary)]">
                                {task.status?.replace("_", " ")}
                              </span>
                            </div>
                          </div>
                          <Avatar className="h-10 w-10 border border-border">
                            <AvatarImage src={task.assignee?.avatar_url ?? undefined} alt={task.assignee?.full_name ?? task.assignee?.email ?? "Assignee"} />
                            <AvatarFallback>{getInitials(task.assignee?.full_name ?? null, task.assignee?.email ?? null)}</AvatarFallback>
                          </Avatar>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-[var(--surface-2)] px-5 py-8 text-sm text-[var(--text-secondary)]">
                    Nothing is assigned to you right now. Once tasks are delegated, your personal queue will show up here.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[var(--surface)] p-0">
              <CardHeader className="flex flex-row items-center justify-between p-6 pb-0">
                <div>
                  <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Upcoming Meetings</p>
                  <CardTitle className="text-2xl">Next 7 days</CardTitle>
                </div>
                <Link href="/meetings" className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-[var(--accent-hover)]">
                  View all meetings
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </CardHeader>
              <CardContent className="p-6">
                {upcomingMeetings.length ? (
                  <div className="divide-y divide-border">
                    {upcomingMeetings.map((meeting) => (
                      <div key={meeting.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">{meeting.title}</p>
                            <p className="mt-1 text-xs text-[var(--text-secondary)]">
                              {meeting.start_time ? formatDateTime(meeting.start_time) : "No time scheduled"}
                            </p>
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">{truncateText(meeting.description ?? "No description added yet.", 120)}</p>
                          </div>
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-primary">
                            <CalendarDays className="h-5 w-5" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-[var(--surface-2)] px-5 py-8 text-sm text-[var(--text-secondary)]">
                    No meetings are scheduled in the next seven days. Add one to keep the committee coordinated.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[var(--surface)] p-0">
              <CardHeader className="p-6 pb-0">
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Recent Activity</p>
                <CardTitle className="text-2xl">Live committee feed</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {recentActivity.length ? (
                  <div className="divide-y divide-border">
                    {recentActivity.slice(0, 8).map((entry) => (
                      <div key={entry.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                        <Avatar className="h-10 w-10 border border-border">
                          <AvatarImage src={entry.actor?.avatar_url ?? undefined} alt={entry.actor?.full_name ?? entry.actor?.email ?? "Actor"} />
                          <AvatarFallback>{getInitials(entry.actor?.full_name ?? null, entry.actor?.email ?? null)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground">
                            <span className="font-medium">{entry.actor?.full_name ?? entry.actor?.email ?? "A team member"}</span>{" "}
                            <span className="text-[var(--text-secondary)]">{entry.action}</span>
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">{formatRelativeTime(entry.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-[var(--surface-2)] px-5 py-8 text-sm text-[var(--text-secondary)]">
                    Activity will appear here once the committee starts creating tasks, meetings, and announcements.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 xl:col-span-4">
            <Card className="bg-[var(--surface)] p-0">
              <CardHeader className="p-6 pb-0">
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Announcements</p>
                <CardTitle className="text-2xl">Pinned updates</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {announcements.length ? (
                  <div className="divide-y divide-border">
                    {announcements.map((announcement) => (
                      <div key={announcement.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">{announcement.title}</p>
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">
                              {truncateText(announcement.content ?? "No announcement body yet.", 110)}
                            </p>
                          </div>
                          {announcement.pinned ? (
                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                              Pinned
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-[var(--surface-2)] px-5 py-8 text-sm text-[var(--text-secondary)]">
                    Pin important updates to keep key information visible for the whole committee.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[var(--surface)] p-0">
              <CardHeader className="p-6 pb-0">
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Org Health</p>
                <CardTitle className="text-2xl">Operational pulse</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-border bg-[var(--surface-2)] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Overdue tasks</p>
                        <p className={cn("mt-2 text-3xl font-semibold", health.overdueTasks > 0 ? "text-red-400" : "text-foreground")}>
                          {health.overdueTasks}
                        </p>
                      </div>
                      <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", health.overdueTasks > 0 ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400")}>
                        {health.overdueTasks > 0 ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-[var(--surface-2)] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Missing handovers</p>
                        <p className={cn("mt-2 text-3xl font-semibold", health.missingHandovers > 0 ? "text-amber-400" : "text-foreground")}>
                          {health.missingHandovers}
                        </p>
                      </div>
                      <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", health.missingHandovers > 0 ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400")}>
                        <Target className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-border bg-[var(--surface-2)] p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Members</p>
                      <p className="mt-2 text-3xl font-semibold text-emerald-400">{health.members}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-[var(--surface-2)] p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Meetings this month</p>
                      <p className="mt-2 text-3xl font-semibold text-foreground">{health.meetingsThisMonth}</p>
                    </div>
                  </div>

                  {healthy ? (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-emerald-300">Your society is on track.</p>
                          <p className="mt-1 text-sm text-emerald-100/70">
                            Tasks are under control and your key handover records are in healthy shape.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border bg-[var(--surface-2)] p-4">
                      <p className="text-sm font-medium text-foreground">A few things need attention.</p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        Tackle overdue work and fill in key handover responsibilities to keep the committee resilient.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent)_18%,var(--surface)),var(--surface))] p-0">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-primary">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Momentum</p>
                    <p className="mt-3 text-lg font-semibold text-foreground">Your operating system for society leadership is live.</p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      Next up: start assigning real tasks, add your first committee meeting, and replace the starter content with your own cadence.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
