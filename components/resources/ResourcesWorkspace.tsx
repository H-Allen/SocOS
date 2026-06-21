"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("react-simple-wysiwyg").then((mod) => mod.default), { ssr: false });
import { FileText, Filter, FolderPlus, Link as LinkIcon, Plus, Search, StickyNote, Tag, Upload, User2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { createBrowserBackendClient } from "@/lib/backend/client";
import { RESOURCE_CATEGORIES, canManageWorkspace, getInitials, isAdmin } from "@/lib/workspace";
import type { PermissionLevel, ResourceRecord, ResourceType, UserRow } from "@/types";
import { formatDate } from "@/utils/format";
import { cn } from "@/utils/cn";

type ResourcesWorkspaceProps = {
  initialResources: ResourceRecord[];
  currentUser: UserRow;
  orgId: string;
  permissionLevel: PermissionLevel;
};

type ResourceForm = {
  title: string;
  description: string;
  type: ResourceType;
  category: string;
  tagsInput: string;
  externalUrl: string;
  content: string;
  file: File | null;
};

const EMPTY_FORM: ResourceForm = {
  title: "",
  description: "",
  type: "file",
  category: "Operations",
  tagsInput: "",
  externalUrl: "",
  content: "",
  file: null
};

const getHostLabel = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

function resourceIcon(type: ResourceType) {
  if (type === "file") {
    return FileText;
  }

  if (type === "link") {
    return LinkIcon;
  }

  return StickyNote;
}

function resourceTypeClasses(type: ResourceType) {
  if (type === "file") {
    return "bg-sky-100 text-sky-700";
  }

  if (type === "link") {
    return "bg-emerald-100 text-emerald-700";
  }

  return "bg-amber-100 text-amber-700";
}

export function ResourcesWorkspace({ initialResources, currentUser, orgId, permissionLevel }: ResourcesWorkspaceProps) {
  const backend = useMemo(() => createBrowserBackendClient(), []);
  const client = backend as any;
  const canManage = canManageWorkspace(permissionLevel);
  const canCreateCategory = isAdmin(permissionLevel);
  const [resources, setResources] = useState(initialResources);
  const [activeCategory, setActiveCategory] = useState("All Resources");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ResourceType>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [detailResource, setDetailResource] = useState<ResourceRecord | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [form, setForm] = useState<ResourceForm>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = useMemo(() => {
    const allCategories = [
      "All Resources",
      ...RESOURCE_CATEGORIES,
      ...customCategories,
      ...(resources.map((resource) => resource.category).filter(Boolean) as string[])
    ];

    return [...new Set(allCategories)];
  }, [customCategories, resources]);

  const existingTags = useMemo(
    () => [...new Set(resources.flatMap((resource) => resource.tags ?? []).filter(Boolean))].sort((left, right) => left.localeCompare(right)),
    [resources]
  );

  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      const haystack = `${resource.title} ${resource.description ?? ""} ${(resource.tags ?? []).join(" ")}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesCategory = activeCategory === "All Resources" || resource.category === activeCategory;
      const matchesType = typeFilter === "all" || resource.type === typeFilter;
      const matchesTags = !selectedTags.length || selectedTags.every((tag) => (resource.tags ?? []).includes(tag));
      const createdAt = resource.created_at ? new Date(resource.created_at).getTime() : null;
      const matchesStart = !startDate || (createdAt !== null && createdAt >= new Date(startDate).getTime());
      const matchesEnd = !endDate || (createdAt !== null && createdAt <= new Date(`${endDate}T23:59:59`).getTime());

      return matchesSearch && matchesCategory && matchesType && matchesTags && matchesStart && matchesEnd;
    });
  }, [activeCategory, endDate, resources, search, selectedTags, startDate, typeFilter]);

  const submitResource = async () => {
    if (!form.title.trim()) {
      return;
    }

    setIsSubmitting(true);

    let fileUrl: string | null = null;
    let externalUrl = form.externalUrl.trim() || null;

    if (form.type === "file" && form.file) {
      const path = `${orgId}/${Date.now()}-${form.file.name}`;
      const upload = await client.storage.from("resources").upload(path, form.file, {
        upsert: false
      });

      if (upload.error) {
        setIsSubmitting(false);
        return;
      }

      fileUrl = upload.data?.publicUrl ?? upload.data?.signedUrl ?? null;
    }

    if (form.type === "note") {
      externalUrl = null;
    }

    const insertPayload = {
      organization_id: orgId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      content: form.type === "note" ? form.content : null,
      type: form.type,
      category: form.category,
      file_url: fileUrl,
      external_url: externalUrl,
      tags: form.tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      uploaded_by: currentUser.id
    };

    const { data, error } = await client
      .from("resources")
      .insert(insertPayload)
      .select(
        "id, organization_id, title, description, content, type, category, file_url, external_url, tags, uploaded_by, created_at, uploader:users(id, full_name, email, avatar_url)"
      )
      .single();

    if (!error && data) {
      setResources((current) => [data as ResourceRecord, ...current]);
      await client.from("activity_logs").insert({
        organization_id: orgId,
        actor_user_id: currentUser.id,
        action: "added a resource",
        metadata: {
          resource_id: data.id,
          resource_title: data.title
        }
      });
      setAddOpen(false);
      setForm(EMPTY_FORM);
    }

    setIsSubmitting(false);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[200px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <div className="rounded-[24px] border border-border bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Categories</p>
          <nav className="space-y-1">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={cn(
                  "flex w-full items-center rounded-2xl px-3 py-2 text-left text-sm transition-colors",
                  activeCategory === category
                    ? "bg-[var(--surface)] font-medium text-foreground shadow-sm"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-foreground"
                )}
              >
                {category}
              </button>
            ))}
          </nav>
          {canCreateCategory ? (
            <Button variant="ghost" className="mt-4 w-full justify-start" onClick={() => setCategoryDialogOpen(true)}>
              <FolderPlus className="h-4 w-4" />
              Create category
            </Button>
          ) : null}
        </div>
      </aside>

      <main className="space-y-6">
        <section className="surface-card overflow-hidden rounded-[28px]">
          <div className="flex flex-col gap-6 p-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Shared knowledge</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">Resources Hub</h1>
              <p className="mt-3 max-w-2xl text-base text-[var(--text-secondary)]">
                Keep governance docs, sponsor links, working notes, and operational files in one place the whole committee can trust.
              </p>
            </div>
            {canManage ? (
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Add Resource
              </Button>
            ) : null}
          </div>
        </section>

        <section className="rounded-[24px] border border-border bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, description, or tags" className="pl-10" />
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Filter className="h-4 w-4" />
              {filteredResources.length} resources
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-4">
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as "all" | ResourceType)} className="flex h-10 rounded-lg border border-border bg-[var(--surface)] px-3 text-sm">
              <option value="all">All types</option>
              <option value="file">File</option>
              <option value="link">Link</option>
              <option value="note">Note</option>
            </select>
            <div className="rounded-lg border border-border bg-[var(--surface)] px-3 py-2">
              <div className="flex flex-wrap gap-2">
                {existingTags.length ? (
                  existingTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setSelectedTags((current) => (current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag]))
                      }
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium",
                        selectedTags.includes(tag) ? "bg-primary text-white" : "bg-[var(--surface-2)] text-[var(--text-secondary)]"
                      )}
                    >
                      {tag}
                    </button>
                  ))
                ) : (
                  <span className="text-sm text-[var(--text-muted)]">No tags yet</span>
                )}
              </div>
            </div>
            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {filteredResources.map((resource) => {
            const Icon = resourceIcon(resource.type);

            return (
              <button
                key={resource.id}
                type="button"
                onClick={() => setDetailResource(resource)}
                className="rounded-2xl border border-border bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(17,17,24,0.08)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", resourceTypeClasses(resource.type))}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                    {resource.category ?? "Operations"}
                  </span>
                </div>
                <h2 className="mt-4 text-lg font-medium text-foreground">{resource.title}</h2>
                <p className="mt-2 line-clamp-2 min-h-[2.8rem] text-sm text-[var(--text-secondary)]">
                  {resource.description ?? resource.content?.replace(/<[^>]+>/g, "") ?? "No description added."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(resource.tags ?? []).map((tag) => (
                    <span key={tag} className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={resource.uploader?.avatar_url ?? undefined} alt={resource.uploader?.full_name ?? resource.uploader?.email ?? "Uploader"} />
                      <AvatarFallback>{getInitials(resource.uploader?.full_name ?? null, resource.uploader?.email ?? null)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{resource.uploader?.full_name ?? resource.uploader?.email ?? "Unknown member"}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{formatDate(resource.created_at)}</p>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </section>
      </main>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create category</DialogTitle>
            <DialogDescription>Add a custom category for this session. It will appear in the filter list and resource form.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-6 pt-2">
            <Input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="For example: Welfare" />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setCategoryDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const nextCategory = newCategory.trim();
                  if (!nextCategory) {
                    return;
                  }

                  setCustomCategories((current) => (current.includes(nextCategory) ? current : [...current, nextCategory]));
                  setForm((current) => ({ ...current, category: nextCategory }));
                  setNewCategory("");
                  setCategoryDialogOpen(false);
                }}
              >
                Save category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Resource</DialogTitle>
            <DialogDescription>Upload a file, save a link, or write a note for the committee.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-6 pt-2">
            <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Title" />
            <Textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Short description"
              className="min-h-[100px]"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as ResourceType }))} className="flex h-10 rounded-lg border border-border bg-[var(--surface)] px-3 text-sm">
                <option value="file">File</option>
                <option value="link">Link</option>
                <option value="note">Note</option>
              </select>
              <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="flex h-10 rounded-lg border border-border bg-[var(--surface)] px-3 text-sm">
                {categories
                  .filter((category) => category !== "All Resources")
                  .map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
              </select>
            </div>

            {form.type === "file" ? (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-[var(--surface-2)] px-4 py-8 text-center">
                <Upload className="h-5 w-5 text-[var(--text-secondary)]" />
                <div>
                  <p className="text-sm font-medium text-foreground">{form.file ? form.file.name : "Choose a file to upload"}</p>
                  <p className="text-sm text-[var(--text-secondary)]">Uploads to Firebase Storage under `resources`.</p>
                </div>
                <input type="file" className="hidden" onChange={(event) => setForm((current) => ({ ...current, file: event.target.files?.[0] ?? null }))} />
              </label>
            ) : null}

            {form.type === "link" ? (
              <div className="space-y-3 rounded-2xl border border-border bg-[var(--surface-2)] p-4">
                <Input value={form.externalUrl} onChange={(event) => setForm((current) => ({ ...current, externalUrl: event.target.value }))} placeholder="https://..." />
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <LinkIcon className="h-4 w-4" />
                  {form.externalUrl ? getHostLabel(form.externalUrl) : "Link preview will show the destination host"}
                </div>
              </div>
            ) : null}

            {form.type === "note" ? (
              <div className="rounded-2xl border border-border bg-white text-[#111118] [&_.rsw-editor]:min-h-[220px] [&_.rsw-editor]:border-0 [&_.rsw-toolbar]:border-b [&_.rsw-toolbar]:border-[#e4e4ec]">
                <Editor value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} />
              </div>
            ) : null}

            <Input value={form.tagsInput} onChange={(event) => setForm((current) => ({ ...current, tagsInput: event.target.value }))} placeholder="Tags, separated by commas" />

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void submitResource()} disabled={isSubmitting || !form.title.trim()}>
                {isSubmitting ? "Saving..." : "Add resource"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(detailResource)} onOpenChange={(open) => !open && setDetailResource(null)}>
        <SheetContent className="overflow-y-auto">
          {detailResource ? (
            <>
              <SheetHeader>
                <SheetTitle>{detailResource.title}</SheetTitle>
                <SheetDescription>{detailResource.category ?? "Operations"}</SheetDescription>
              </SheetHeader>
              <div className="space-y-5 p-6">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={detailResource.uploader?.avatar_url ?? undefined} alt={detailResource.uploader?.full_name ?? detailResource.uploader?.email ?? "Uploader"} />
                    <AvatarFallback>{getInitials(detailResource.uploader?.full_name ?? null, detailResource.uploader?.email ?? null)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{detailResource.uploader?.full_name ?? detailResource.uploader?.email ?? "Unknown member"}</p>
                    <p className="text-sm text-[var(--text-secondary)]">Uploaded {formatDate(detailResource.created_at)}</p>
                  </div>
                </div>

                {detailResource.description ? <p className="text-sm leading-7 text-foreground">{detailResource.description}</p> : null}

                {detailResource.type === "file" && detailResource.file_url ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-border bg-[var(--surface-2)] p-4">
                      <iframe src={detailResource.file_url} title={detailResource.title} className="h-[420px] w-full rounded-xl border border-border bg-white" />
                    </div>
                    <Button asChild>
                      <a href={detailResource.file_url} target="_blank" rel="noreferrer">
                        Download file
                      </a>
                    </Button>
                  </div>
                ) : null}

                {detailResource.type === "link" && detailResource.external_url ? (
                  <div className="rounded-2xl border border-border bg-[var(--surface-2)] p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                        <LinkIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{getHostLabel(detailResource.external_url)}</p>
                        <p className="text-sm text-[var(--text-secondary)]">{detailResource.external_url}</p>
                      </div>
                    </div>
                    <Button asChild className="mt-4">
                      <a href={detailResource.external_url} target="_blank" rel="noreferrer">
                        Open link
                      </a>
                    </Button>
                  </div>
                ) : null}

                {detailResource.type === "note" ? (
                  <div className="rounded-2xl border border-border bg-white p-5 text-[#111118]">
                    <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: detailResource.content ?? "<p>No note content yet.</p>" }} />
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {(detailResource.tags ?? []).map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                      <Tag className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
