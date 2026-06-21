"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarRange,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  Link2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Quote,
  Save,
  Trash2,
  UserRound
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createBrowserBackendClient } from "@/lib/backend/client";
import {
  HANDOVER_MONTHS,
  calculateHandoverCompletion,
  createEmptyHandoverContent,
  createLocalId,
  deslugifyRole,
  getChecklistProgress,
  getHandoverStatus,
  normalizeHandoverContent,
  serializeHandoverContent
} from "@/lib/handover";
import type { HandoverContent } from "@/lib/handover";
import type { HandoverRow } from "@/types";
import { formatDate } from "@/utils/format";
import { cn } from "@/utils/cn";

type HandoverDetailClientProps = {
  organizationId: string;
  roleSlug: string;
  initialHandover: HandoverRow | null;
};

type SaveState = "idle" | "queued" | "saving" | "saved" | "error";

type SectionConfig = {
  id:
    | "role-purpose"
    | "recurring-responsibilities"
    | "annual-timeline"
    | "important-documents"
    | "key-contacts"
    | "advice"
    | "mistakes"
    | "checklist";
  title: string;
};

const SECTION_CONFIG: SectionConfig[] = [
  { id: "role-purpose", title: "What this role does" },
  { id: "recurring-responsibilities", title: "Recurring responsibilities" },
  { id: "annual-timeline", title: "Annual timeline" },
  { id: "important-documents", title: "Important documents" },
  { id: "key-contacts", title: "Key contacts" },
  { id: "advice", title: "Advice from previous holder" },
  { id: "mistakes", title: "Mistakes to avoid" },
  { id: "checklist", title: "Handover checklist" }
];

function getStatusClasses(status: string) {
  if (status === "Complete") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "Empty") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-sky-100 text-sky-700";
}

function EmptyValue({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-[var(--surface-2)] px-4 py-5 text-sm text-[var(--text-secondary)]">
      {children}
    </div>
  );
}

function SectionCard({
  id,
  title,
  indicator,
  children
}: {
  id: string;
  title: string;
  indicator?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      data-handover-section={id}
      className="mb-6 rounded-xl border border-border bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-6"
    >
      <div className="mb-4 flex items-start justify-between gap-4 border-b border-border pb-2">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {indicator}
      </div>
      {children}
    </section>
  );
}

export function HandoverDetailClient({ organizationId, roleSlug, initialHandover }: HandoverDetailClientProps) {
  const backend = useMemo(() => createBrowserBackendClient(), []);
  const client = backend as any;
  const derivedRoleName = useMemo(
    () => initialHandover?.role_name ?? deslugifyRole(roleSlug) ?? "Handover",
    [initialHandover?.role_name, roleSlug]
  );
  const [handoverId, setHandoverId] = useState<string | null>(initialHandover?.id ?? null);
  const [roleName] = useState(derivedRoleName);
  const [content, setContent] = useState<HandoverContent>(() =>
    initialHandover ? normalizeHandoverContent(initialHandover) : createEmptyHandoverContent()
  );
  const [completionPercent, setCompletionPercent] = useState(initialHandover?.completion_percent ?? 0);
  const [updatedAt, setUpdatedAt] = useState<string | null>(initialHandover?.updated_at ?? null);
  const [isEditing, setIsEditing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessageVisible, setSaveMessageVisible] = useState(false);
  const [activeSection, setActiveSection] = useState(SECTION_CONFIG[0].id);
  const [focusedSection, setFocusedSection] = useState<SectionConfig["id"] | null>(null);
  const [dirtyVersion, setDirtyVersion] = useState(0);
  const saveTimeoutRef = useRef<number | null>(null);
  const hideToastTimeoutRef = useRef<number | null>(null);
  const saveCounterRef = useRef(0);

  const status = getHandoverStatus(completionPercent);
  const checklistProgress = getChecklistProgress(content.handoverChecklist);

  useEffect(() => {
    const sections = SECTION_CONFIG.map((section) => document.getElementById(section.id)).filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio);

        if (visibleEntries[0]?.target.id) {
          setActiveSection(visibleEntries[0].target.id as SectionConfig["id"]);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.15, 0.4, 0.7]
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!dirtyVersion) {
      return;
    }

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    setSaveState("queued");
    saveTimeoutRef.current = window.setTimeout(() => {
      void saveHandover();
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, dirtyVersion]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }

      if (hideToastTimeoutRef.current) {
        window.clearTimeout(hideToastTimeoutRef.current);
      }
    };
  }, []);

  const markDirty = (sectionId: SectionConfig["id"], nextContent: HandoverContent | ((current: HandoverContent) => HandoverContent)) => {
    setFocusedSection(sectionId);
    setContent((current) => (typeof nextContent === "function" ? nextContent(current) : nextContent));
    setDirtyVersion((value) => value + 1);
  };

  const saveHandover = async () => {
    const saveId = ++saveCounterRef.current;
    const nextCompletion = calculateHandoverCompletion(content);

    setSaveState("saving");

    const payload = {
      organization_id: organizationId,
      role_name: roleName,
      responsibilities: content.rolePurpose.trim() || null,
      annual_timeline: JSON.stringify(content.annualTimeline),
      key_contacts: JSON.stringify(content.keyContacts),
      advice: content.adviceFromPreviousHolder.trim() || null,
      mistakes: content.mistakesToAvoid.filter((item) => item.trim()).join("\n") || null,
      checklist: content.handoverChecklist,
      content: serializeHandoverContent(content),
      completion_percent: nextCompletion,
      updated_at: new Date().toISOString()
    };

    const { data, error } = handoverId
      ? await client.from("handovers").update(payload).eq("id", handoverId).select("id, updated_at, completion_percent").single()
      : await client.from("handovers").insert(payload).select("id, updated_at, completion_percent").single();

    if (saveId !== saveCounterRef.current) {
      return;
    }

    if (error) {
      setSaveState("error");
      return;
    }

    if (!handoverId && data?.id) {
      setHandoverId(data.id);
    }

    setCompletionPercent(data?.completion_percent ?? nextCompletion);
    setUpdatedAt(data?.updated_at ?? payload.updated_at);
    setSaveState("saved");
    setSaveMessageVisible(true);

    if (hideToastTimeoutRef.current) {
      window.clearTimeout(hideToastTimeoutRef.current);
    }

    hideToastTimeoutRef.current = window.setTimeout(() => {
      setSaveMessageVisible(false);
      setSaveState("idle");
    }, 1800);
  };

  const sectionIndicator = (sectionId: SectionConfig["id"]) => {
    if (focusedSection !== sectionId) {
      return null;
    }

    if (saveState === "saving" || saveState === "queued") {
      return <span className="text-sm text-[var(--text-secondary)]">Saving...</span>;
    }

    if (saveState === "saved") {
      return (
        <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
          <Check className="h-4 w-4" />
          Saved
        </span>
      );
    }

    if (saveState === "error") {
      return <span className="text-sm text-red-500">Save failed</span>;
    }

    return null;
  };

  const renderStringList = (items: string[], emptyText: string, icon?: React.ReactNode) => {
    const definedItems = items.filter((item) => item.trim().length > 0);

    if (!definedItems.length) {
      return <EmptyValue>{emptyText}</EmptyValue>;
    }

    return (
      <div className="space-y-3">
        {definedItems.map((item) => (
          <div key={item} className="flex items-start gap-3 rounded-2xl border border-border bg-[var(--surface)] px-4 py-3">
            {icon}
            <p className="text-sm text-foreground">{item}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="xl:sticky xl:top-28 xl:h-fit">
        <div className="rounded-[24px] border border-border bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-5">
          <Link href="/handovers" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to vault
          </Link>

          <div className="mt-5 rounded-2xl border border-border bg-[var(--surface)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Role</p>
                <h1 className="mt-2 text-2xl font-semibold text-foreground">{roleName}</h1>
              </div>
              <span className={cn("rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]", getStatusClasses(status))}>
                {status}
              </span>
            </div>
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Completion</span>
                <span className="font-semibold text-foreground">{completionPercent}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    status === "Complete" && "bg-emerald-500",
                    status === "In Progress" && "bg-sky-500",
                    status === "Empty" && "bg-amber-400"
                  )}
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              {completionPercent > 0 && updatedAt ? `Last updated ${formatDate(updatedAt)}` : "Never updated"}
            </p>
          </div>

          <nav className="mt-5 space-y-1">
            {SECTION_CONFIG.map((section, index) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-colors",
                  activeSection === section.id
                    ? "bg-[var(--surface)] text-foreground shadow-sm"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-foreground"
                )}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-semibold text-[var(--text-secondary)]">
                  {index + 1}
                </span>
                <span className="min-w-0 truncate">{section.title}</span>
                {activeSection === section.id ? <ChevronRight className="ml-auto h-4 w-4" /> : null}
              </a>
            ))}
          </nav>
        </div>
      </aside>

      <div className="min-w-0">
        <section className="surface-card overflow-hidden rounded-[28px]">
          <div className="flex flex-col gap-6 p-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Institutional memory</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">{roleName} Handover</h2>
              <p className="mt-3 text-base text-[var(--text-secondary)]">
                Capture the context, relationships, and routines that make this role work well from day one.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant={isEditing ? "secondary" : "default"} onClick={() => setIsEditing((value) => !value)}>
                <Pencil className="h-4 w-4" />
                {isEditing ? "View mode" : "Edit"}
              </Button>
            </div>
          </div>
        </section>

        <div className="mt-6">
          <SectionCard id="role-purpose" title="What this role does" indicator={sectionIndicator("role-purpose")}>
            {isEditing ? (
              <Textarea
                value={content.rolePurpose}
                onChange={(event) => {
                  const value = event.target.value;
                  markDirty("role-purpose", (current) => ({ ...current, rolePurpose: value }));
                }}
                placeholder="Describe the primary responsibilities of this role in 2–3 sentences."
                className="min-h-[160px]"
              />
            ) : content.rolePurpose.trim() ? (
              <div className="space-y-3">
                {content.rolePurpose.split(/\n{2,}/).map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <EmptyValue>No role description yet. Switch to edit mode to capture the purpose of this role.</EmptyValue>
            )}
          </SectionCard>

          <SectionCard
            id="recurring-responsibilities"
            title="Recurring responsibilities"
            indicator={sectionIndicator("recurring-responsibilities")}
          >
            {isEditing ? (
              <div className="space-y-3">
                {(content.recurringResponsibilities.length ? content.recurringResponsibilities : [""]).map((item, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-2xl border border-border bg-[var(--surface)] px-4 py-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-[var(--surface-2)]">
                      <Check className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                    </div>
                    <Input
                      value={item}
                      onChange={(event) => {
                        const value = event.target.value;
                        markDirty("recurring-responsibilities", (current) => {
                          const nextItems = [...current.recurringResponsibilities];
                          nextItems[index] = value;
                          return { ...current, recurringResponsibilities: nextItems };
                        });
                      }}
                      placeholder={index === 0 ? "Weekly committee emails" : "Monthly treasurer reports"}
                      className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const nextItems = content.recurringResponsibilities.filter((_, itemIndex) => itemIndex !== index);
                        markDirty("recurring-responsibilities", { ...content, recurringResponsibilities: nextItems });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() =>
                    markDirty("recurring-responsibilities", {
                      ...content,
                      recurringResponsibilities: [...content.recurringResponsibilities, ""]
                    })
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add responsibility
                </Button>
              </div>
            ) : (
              renderStringList(content.recurringResponsibilities, "No recurring responsibilities added yet.", (
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-[var(--surface-2)]">
                  <Check className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                </div>
              ))
            )}
          </SectionCard>

          <SectionCard id="annual-timeline" title="Annual timeline" indicator={sectionIndicator("annual-timeline")}>
            <div className="overflow-x-auto pb-2">
              <div className="grid min-w-[960px] grid-cols-12 gap-3">
                {HANDOVER_MONTHS.map((month) => {
                  const items = content.annualTimeline[month] ?? [];

                  return (
                    <div
                      key={month}
                    className="flex min-h-[260px] flex-col rounded-2xl border border-border bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface)_96%,transparent),color-mix(in_srgb,var(--surface-2)_88%,transparent))] p-3"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{month.slice(0, 3)}</p>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Month</p>
                        </div>
                        <CalendarRange className="h-4 w-4 text-[var(--text-secondary)]" />
                      </div>

                      <div className="mt-3 flex flex-1 flex-col gap-2">
                        {items.filter((item) => item.trim()).length ? (
                          items.map((item, index) =>
                            isEditing ? (
                              <div key={`${month}-${index}`} className="rounded-2xl border border-border bg-[var(--surface)] px-3 py-2">
                                <div className="flex items-start gap-2">
                                  <Input
                                    value={item}
                                    onChange={(event) => {
                                      const monthItems = [...items];
                                      monthItems[index] = event.target.value;
                                      markDirty("annual-timeline", {
                                        ...content,
                                        annualTimeline: { ...content.annualTimeline, [month]: monthItems }
                                      });
                                    }}
                                    placeholder="Add a milestone"
                                    className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      const monthItems = items.filter((_, itemIndex) => itemIndex !== index);
                                      markDirty("annual-timeline", {
                                        ...content,
                                        annualTimeline: { ...content.annualTimeline, [month]: monthItems }
                                      });
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : item.trim() ? (
                              <span
                                key={`${month}-${index}`}
                                className="inline-flex items-start rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,white_88%)] px-3 py-1.5 text-xs font-medium text-foreground"
                              >
                                {item}
                              </span>
                            ) : null
                          )
                        ) : (
                          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-border px-3 text-center text-xs text-[var(--text-muted)]">
                            {isEditing ? "No tasks for this month yet." : "No tasks"}
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <Button
                          variant="ghost"
                          className="mt-3 justify-start"
                          onClick={() =>
                            markDirty("annual-timeline", {
                              ...content,
                              annualTimeline: { ...content.annualTimeline, [month]: [...items, ""] }
                            })
                          }
                        >
                          <Plus className="h-4 w-4" />
                          Add item
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </SectionCard>

          <SectionCard id="important-documents" title="Important documents" indicator={sectionIndicator("important-documents")}>
            {isEditing ? (
              <div className="space-y-3">
                {content.importantDocuments.length ? (
                  content.importantDocuments.map((document, index) => (
                    <div key={document.id} className="grid gap-3 rounded-2xl border border-border bg-[var(--surface)] p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-primary">
                          <FileText className="h-4 w-4" />
                        </div>
                        <Input
                          value={document.title}
                          placeholder="Document title"
                          onChange={(event) => {
                            const nextDocuments = [...content.importantDocuments];
                            nextDocuments[index] = { ...document, title: event.target.value };
                            markDirty("important-documents", { ...content, importantDocuments: nextDocuments });
                          }}
                        />
                      </div>
                      <Input
                        value={document.url}
                        placeholder="https://..."
                        onChange={(event) => {
                          const nextDocuments = [...content.importantDocuments];
                          nextDocuments[index] = { ...document, url: event.target.value };
                          markDirty("important-documents", { ...content, importantDocuments: nextDocuments });
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          markDirty("important-documents", {
                            ...content,
                            importantDocuments: content.importantDocuments.filter((item) => item.id !== document.id)
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <EmptyValue>Add the drive folders, templates, and reference docs a successor will need immediately.</EmptyValue>
                )}
                <Button
                  variant="outline"
                  onClick={() =>
                    markDirty("important-documents", {
                      ...content,
                      importantDocuments: [...content.importantDocuments, { id: createLocalId(), title: "", url: "" }]
                    })
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add document
                </Button>
              </div>
            ) : content.importantDocuments.filter((item) => item.title.trim() && item.url.trim()).length ? (
              <div className="space-y-3">
                {content.importantDocuments
                  .filter((item) => item.title.trim() && item.url.trim())
                  .map((document) => (
                    <a
                      key={document.id}
                      href={document.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-[var(--surface)] px-4 py-4 transition-colors hover:bg-[var(--surface-2)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-primary">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{document.title}</p>
                          <p className="text-sm text-[var(--text-secondary)]">{document.url}</p>
                        </div>
                      </div>
                      <Link2 className="h-4 w-4 text-[var(--text-secondary)]" />
                    </a>
                  ))}
              </div>
            ) : (
              <EmptyValue>No important documents linked yet.</EmptyValue>
            )}
          </SectionCard>

          <SectionCard id="key-contacts" title="Key contacts" indicator={sectionIndicator("key-contacts")}>
            {isEditing ? (
              <div className="space-y-4">
                {content.keyContacts.length ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {content.keyContacts.map((contact, index) => (
                      <div key={contact.id} className="rounded-2xl border border-border bg-[var(--surface)] p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-primary">
                              <UserRound className="h-4 w-4" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">Contact {index + 1}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              markDirty("key-contacts", {
                                ...content,
                                keyContacts: content.keyContacts.filter((item) => item.id !== contact.id)
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-3">
                          <Input
                            value={contact.name}
                            placeholder="Name"
                            onChange={(event) => {
                              const nextContacts = [...content.keyContacts];
                              nextContacts[index] = { ...contact, name: event.target.value };
                              markDirty("key-contacts", { ...content, keyContacts: nextContacts });
                            }}
                          />
                          <Input
                            value={contact.role}
                            placeholder="Role"
                            onChange={(event) => {
                              const nextContacts = [...content.keyContacts];
                              nextContacts[index] = { ...contact, role: event.target.value };
                              markDirty("key-contacts", { ...content, keyContacts: nextContacts });
                            }}
                          />
                          <Input
                            value={contact.email}
                            placeholder="Email"
                            onChange={(event) => {
                              const nextContacts = [...content.keyContacts];
                              nextContacts[index] = { ...contact, email: event.target.value };
                              markDirty("key-contacts", { ...content, keyContacts: nextContacts });
                            }}
                          />
                          <Input
                            value={contact.phone}
                            placeholder="Phone (optional)"
                            onChange={(event) => {
                              const nextContacts = [...content.keyContacts];
                              nextContacts[index] = { ...contact, phone: event.target.value };
                              markDirty("key-contacts", { ...content, keyContacts: nextContacts });
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyValue>Add the people this role depends on most often.</EmptyValue>
                )}
                <Button
                  variant="outline"
                  onClick={() =>
                    markDirty("key-contacts", {
                      ...content,
                      keyContacts: [...content.keyContacts, { id: createLocalId(), name: "", role: "", email: "", phone: "" }]
                    })
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add contact
                </Button>
              </div>
            ) : content.keyContacts.filter((item) => item.name.trim() && item.role.trim() && item.email.trim()).length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {content.keyContacts
                  .filter((item) => item.name.trim() && item.role.trim() && item.email.trim())
                  .map((contact) => (
                    <div key={contact.id} className="rounded-2xl border border-border bg-[var(--surface)] p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-primary">
                          <UserRound className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{contact.name}</p>
                          <p className="text-sm text-[var(--text-secondary)]">{contact.role}</p>
                          <div className="mt-3 space-y-2 text-sm text-foreground">
                            <p className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-[var(--text-secondary)]" />
                              {contact.email}
                            </p>
                            {contact.phone ? (
                              <p className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-[var(--text-secondary)]" />
                                {contact.phone}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <EmptyValue>No key contacts added yet.</EmptyValue>
            )}
          </SectionCard>

          <SectionCard id="advice" title="Advice from previous holder" indicator={sectionIndicator("advice")}>
            <div className="rounded-2xl border border-border border-l-4 border-l-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface)_88%)] p-5 text-foreground">
              <div className="mb-3 flex items-center gap-2 text-[var(--text-secondary)]">
                <Quote className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.16em]">Passed down</span>
              </div>
              {isEditing ? (
                <Textarea
                  value={content.adviceFromPreviousHolder}
                  onChange={(event) => {
                    const value = event.target.value;
                    markDirty("advice", (current) => ({ ...current, adviceFromPreviousHolder: value }));
                  }}
                  placeholder="What do you wish you'd known on day one?"
                  className="min-h-[180px] border-0 bg-transparent px-0 text-foreground shadow-none placeholder:text-[var(--text-muted)] focus-visible:ring-0"
                />
              ) : content.adviceFromPreviousHolder.trim() ? (
                <p className="text-base leading-8 text-foreground">{content.adviceFromPreviousHolder}</p>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">No advice has been passed down yet.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard id="mistakes" title="Mistakes to avoid" indicator={sectionIndicator("mistakes")}>
            {isEditing ? (
              <div className="space-y-3">
                {(content.mistakesToAvoid.length ? content.mistakesToAvoid : [""]).map((item, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <Input
                      value={item}
                      onChange={(event) => {
                        const value = event.target.value;
                        markDirty("mistakes", (current) => {
                          const nextItems = [...current.mistakesToAvoid];
                          nextItems[index] = value;
                          return { ...current, mistakesToAvoid: nextItems };
                        });
                      }}
                      placeholder={
                        index === 0
                          ? "Don't leave sponsorship emails to the last week"
                          : "Always CC the president on formal comms"
                      }
                      className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const nextItems = content.mistakesToAvoid.filter((_, itemIndex) => itemIndex !== index);
                        markDirty("mistakes", { ...content, mistakesToAvoid: nextItems });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => markDirty("mistakes", { ...content, mistakesToAvoid: [...content.mistakesToAvoid, ""] })}
                >
                  <Plus className="h-4 w-4" />
                  Add warning
                </Button>
              </div>
            ) : (
              renderStringList(
                content.mistakesToAvoid,
                "No warnings have been documented yet.",
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              )
            )}
          </SectionCard>

          <SectionCard id="checklist" title="Handover checklist" indicator={sectionIndicator("checklist")}>
            <div className="mb-5 rounded-2xl border border-border bg-[var(--surface)] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {checklistProgress.completedItems} of {checklistProgress.totalItems} complete
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">Use this to make the handover practical, not just informative.</p>
                </div>
                <div className="w-full max-w-[240px]">
                  <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: `${checklistProgress.totalItems ? (checklistProgress.completedItems / checklistProgress.totalItems) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {content.handoverChecklist.map((item, index) =>
                isEditing ? (
                  <div key={item.id} className="rounded-2xl border border-border bg-[var(--surface)] p-4">
                    <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)_160px_auto]">
                      <button
                        type="button"
                        onClick={() => {
                          const nextItems = [...content.handoverChecklist];
                          nextItems[index] = { ...item, completed: !item.completed };
                          markDirty("checklist", { ...content, handoverChecklist: nextItems });
                        }}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors",
                          item.completed
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-border bg-[var(--surface-2)] text-[var(--text-secondary)]"
                        )}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <Input
                        value={item.text}
                        onChange={(event) => {
                          const nextItems = [...content.handoverChecklist];
                          nextItems[index] = { ...item, text: event.target.value };
                          markDirty("checklist", { ...content, handoverChecklist: nextItems });
                        }}
                        placeholder="Checklist item"
                      />
                      <Input
                        type="date"
                        value={item.dueDate}
                        onChange={(event) => {
                          const nextItems = [...content.handoverChecklist];
                          nextItems[index] = { ...item, dueDate: event.target.value };
                          markDirty("checklist", { ...content, handoverChecklist: nextItems });
                        }}
                      />
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={index === 0}
                          onClick={() => {
                            const nextItems = [...content.handoverChecklist];
                            [nextItems[index - 1], nextItems[index]] = [nextItems[index], nextItems[index - 1]];
                            markDirty("checklist", { ...content, handoverChecklist: nextItems });
                          }}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={index === content.handoverChecklist.length - 1}
                          onClick={() => {
                            const nextItems = [...content.handoverChecklist];
                            [nextItems[index], nextItems[index + 1]] = [nextItems[index + 1], nextItems[index]];
                            markDirty("checklist", { ...content, handoverChecklist: nextItems });
                          }}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            markDirty("checklist", {
                              ...content,
                              handoverChecklist: content.handoverChecklist.filter((checklistItem) => checklistItem.id !== item.id)
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : item.text.trim() ? (
                  <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-[var(--surface)] px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-2xl border",
                          item.completed
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-border bg-[var(--surface-2)] text-[var(--text-secondary)]"
                        )}
                      >
                        {item.completed ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.text}</p>
                        {item.dueDate ? <p className="text-sm text-[var(--text-secondary)]">Due {formatDate(item.dueDate)}</p> : null}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                        item.completed ? "bg-emerald-100 text-emerald-700" : "bg-[var(--surface-2)] text-[var(--text-secondary)]"
                      )}
                    >
                      {item.completed ? "Done" : "Pending"}
                    </span>
                  </div>
                ) : null
              )}
            </div>

            {isEditing ? (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() =>
                  markDirty("checklist", {
                    ...content,
                    handoverChecklist: [
                      ...content.handoverChecklist,
                      { id: createLocalId(), text: "", completed: false, dueDate: "" }
                    ]
                  })
                }
              >
                <Plus className="h-4 w-4" />
                Add checklist item
              </Button>
            ) : null}
          </SectionCard>
        </div>
      </div>

      <div
        className={cn(
          "fixed bottom-6 right-6 z-40 rounded-full border border-emerald-200 bg-white/95 px-4 py-2 text-sm font-medium text-emerald-700 shadow-lg backdrop-blur transition-all",
          saveMessageVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
        )}
      >
        Saved
      </div>
    </div>
  );
}
