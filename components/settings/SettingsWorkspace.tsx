"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Building2, CalendarDays, Copy, CreditCard, FolderOpen, ImagePlus, Plus, Slack, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ensureOrganizationJoinCode, updateNavigationConfig } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createBrowserBackendClient } from "@/lib/backend/client";
import { builtInNavItems, parseNavigationConfig, type CustomNavItem, type NavigationConfig } from "@/lib/navigation";
import { formatRoleLabel, isAdmin } from "@/lib/workspace";
import type { OrganizationRoleRecord, OrganizationRow, OrganizationType, PermissionLevel } from "@/types";
import { cn } from "@/utils/cn";

type SettingsWorkspaceProps = {
  organization: OrganizationRow;
  initialRoles: OrganizationRoleRecord[];
  permissionLevel: PermissionLevel;
};

const builtInRoles = [
  { name: "President", permission_level: "admin" as const },
  { name: "Secretary", permission_level: "admin" as const },
  { name: "Treasurer", permission_level: "admin" as const },
  { name: "Committee", permission_level: "committee" as const },
  { name: "Member", permission_level: "member" as const }
];

const organizationTypeOptions: Array<{ label: string; value: OrganizationType }> = [
  { label: "Sports Club", value: "sports_club" },
  { label: "Engineering Team", value: "engineering_team" },
  { label: "Academic Society", value: "academic_society" },
  { label: "Finance Society", value: "finance_society" },
  { label: "Social Club", value: "social_club" },
  { label: "Other", value: "other" }
];

export function SettingsWorkspace({ organization, initialRoles, permissionLevel }: SettingsWorkspaceProps) {
  const router = useRouter();
  const backend = useMemo(() => createBrowserBackendClient(), []);
  const client = backend as any;
  const canAdmin = isAdmin(permissionLevel);

  const [orgState, setOrgState] = useState(organization);
  const [roles, setRoles] = useState(initialRoles);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRolePermission, setNewRolePermission] = useState<PermissionLevel>("member");
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [deletingOrg, setDeletingOrg] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [navigationConfig, setNavigationConfig] = useState<NavigationConfig>(() => parseNavigationConfig(organization.navigation_config));
  const [newNavLabel, setNewNavLabel] = useState("");
  const [newNavHref, setNewNavHref] = useState("");
  const [savingNavigation, setSavingNavigation] = useState(false);
  const [navigationError, setNavigationError] = useState<string | null>(null);

  const allRoles = [...builtInRoles, ...roles];

  const toggleBuiltInTab = (id: NavigationConfig["visibleBuiltIns"][number]) => {
    if (id === "dashboard") return;
    setNavigationConfig((current) => ({
      ...current,
      visibleBuiltIns: current.visibleBuiltIns.includes(id)
        ? current.visibleBuiltIns.filter((item) => item !== id)
        : [...current.visibleBuiltIns, id]
    }));
  };

  const addCustomNavItem = () => {
    if (!newNavLabel.trim() || !newNavHref.trim()) return;
    const item: CustomNavItem = {
      id: `custom-${Date.now()}`,
      label: newNavLabel.trim(),
      href: newNavHref.trim(),
      visibleToMembers: true
    };
    setNavigationConfig((current) => ({ ...current, customItems: [...current.customItems, item] }));
    setNewNavLabel("");
    setNewNavHref("");
  };

  const saveNavigation = async () => {
    setSavingNavigation(true);
    setNavigationError(null);
    const result = await updateNavigationConfig({
      organizationId: orgState.id,
      visibleBuiltIns: navigationConfig.visibleBuiltIns,
      customItems: navigationConfig.customItems
    });

    if (result.error) {
      setNavigationError(result.error);
    } else {
      setOrgState((current) => ({ ...current, navigation_config: navigationConfig as unknown as OrganizationRow["navigation_config"] }));
    }

    setSavingNavigation(false);
  };

  const copyJoinCode = async () => {
    if (!orgState.join_code) return;

    await navigator.clipboard.writeText(orgState.join_code);
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 1600);
  };

  const generateCode = async () => {
    setGeneratingCode(true);
    const result = await ensureOrganizationJoinCode(orgState.id);

    if (result.code) {
      setOrgState((current) => ({ ...current, join_code: result.code }));
    }

    setGeneratingCode(false);
  };

  const saveGeneral = async () => {
    setSavingGeneral(true);
    const { data, error } = await client
      .from("organizations")
      .update({
        name: orgState.name,
        university: orgState.university,
        type: orgState.type
      })
      .eq("id", orgState.id)
      .select("*")
      .single();

    if (!error && data) {
      setOrgState(data as OrganizationRow);
    }

    setSavingGeneral(false);
  };

  const saveBranding = async () => {
    if (!logoFile) {
      return;
    }

    setSavingBranding(true);
    const ext = logoFile.name.split(".").pop() ?? "png";
    const path = `${orgState.id}/logo-${Date.now()}.${ext}`;
    const upload = await client.storage.from("org-logos").upload(path, logoFile, { upsert: true });

    if (!upload.error) {
      const signedUrl = await client.storage.from("org-logos").createSignedUrl(path);
      const logoUrl = signedUrl.data.signedUrl;
      const { data, error } = await client.from("organizations").update({ logo_url: logoUrl }).eq("id", orgState.id).select("*").single();

      if (!error && data) {
        setOrgState(data as OrganizationRow);
        setLogoFile(null);
      }
    }

    setSavingBranding(false);
  };

  const addRole = async () => {
    if (!newRoleName.trim()) {
      return;
    }

    setSavingRole(true);
    const { data, error } = await client
      .from("organization_roles")
      .insert({
        organization_id: orgState.id,
        name: newRoleName.trim(),
        permission_level: newRolePermission
      })
      .select("*")
      .single();

    if (!error && data) {
      setRoles((current) => [...current, data as OrganizationRoleRecord]);
      setNewRoleName("");
      setNewRolePermission("member");
    }

    setSavingRole(false);
  };

  const removeRole = async () => {
    if (!deleteRoleId) {
      return;
    }

    const { error } = await client.from("organization_roles").delete().eq("id", deleteRoleId);

    if (!error) {
      setRoles((current) => current.filter((role) => role.id !== deleteRoleId));
      setDeleteRoleId(null);
    }
  };

  const deleteOrganization = async () => {
    if (confirmName !== orgState.name) {
      return;
    }

    setDeletingOrg(true);
    const { error } = await client.from("organizations").delete().eq("id", orgState.id);

    if (!error) {
      router.push("/onboarding");
      router.refresh();
    }

    setDeletingOrg(false);
  };

  return (
    <div className="space-y-6">
      <section className="surface-card overflow-hidden rounded-[28px]">
        <div className="flex flex-col gap-6 p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Organization control</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">Settings</h1>
            <p className="mt-3 max-w-2xl text-base text-[var(--text-secondary)]">
              Manage the organization profile, brand assets, custom roles, and the operational controls around your workspace.
            </p>
          </div>
        </div>
      </section>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="navigation">Navigation</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="rounded-[24px] border border-border bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Organization name</label>
                <Input value={orgState.name} onChange={(event) => setOrgState((current) => ({ ...current, name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">University</label>
                <Input value={orgState.university ?? ""} onChange={(event) => setOrgState((current) => ({ ...current, university: event.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">Type</label>
                <select
                  value={orgState.type ?? "other"}
                  onChange={(event) => setOrgState((current) => ({ ...current, type: event.target.value as OrganizationType }))}
                  className="flex h-10 w-full rounded-lg border border-border bg-[var(--surface)] px-3 text-sm"
                >
                  {organizationTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">Society code</label>
                <div className="flex gap-3">
                  <Input value={orgState.join_code ?? "Not generated yet"} readOnly className="font-mono tracking-[0.18em]" />
                  {orgState.join_code ? (
                    <Button type="button" variant="outline" onClick={() => void copyJoinCode()}>
                      <Copy className="h-4 w-4" />
                      {copiedCode ? "Copied" : "Copy"}
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => void generateCode()} disabled={generatingCode}>
                      {generatingCode ? "Generating..." : "Generate"}
                    </Button>
                  )}
                </div>
                <p className="text-sm text-[var(--text-secondary)]">Share this with members who should join this society directly.</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => void saveGeneral()} disabled={savingGeneral}>
                {savingGeneral ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="directory">
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-[24px] border border-border bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-6">
              <p className="text-sm font-medium text-foreground">Directory management</p>
              <h3 className="mt-3 text-2xl font-semibold text-foreground">Teams and member assignment</h3>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">
                The Members page is now a read-only directory. Committee and admins manage teams, team leaders, team membership, and team-specific induction from the Teams cockpit.
              </p>
              <Button asChild className="mt-5">
                <Link href="/teams">Open Teams cockpit</Link>
              </Button>
            </div>
            <div className="rounded-[24px] border border-border bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-6">
              <p className="text-sm font-medium text-foreground">Society hierarchy</p>
              <div className="mt-5 space-y-3">
                {["President", "Secretary / Treasurer", "Committee", "Members"].map((label, index) => (
                  <div key={label} className="flex items-center gap-3 rounded-2xl border border-border bg-[var(--surface)] px-4 py-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">{index + 1}</span>
                    <span className="text-sm font-medium text-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="navigation">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="rounded-[24px] border border-border bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Member navigation</p>
                  <h3 className="mt-3 text-2xl font-semibold text-foreground">Choose which tabs show in the app</h3>
                  <p className="mt-3 max-w-2xl text-sm text-[var(--text-secondary)]">
                    President, Secretary, and Treasurer can customise the sidebar for the society. Dashboard always stays visible so members can reach their profile and onboarding.
                  </p>
                </div>
                <Button onClick={() => void saveNavigation()} disabled={!canAdmin || savingNavigation}>
                  {savingNavigation ? "Saving..." : "Save navigation"}
                </Button>
              </div>
              {navigationError ? <p className="mt-4 text-sm font-medium text-red-500">{navigationError}</p> : null}
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {builtInNavItems.map((item) => {
                  const Icon = item.icon;
                  const checked = navigationConfig.visibleBuiltIns.includes(item.id);
                  return (
                    <label key={item.id} className="flex cursor-pointer gap-4 rounded-2xl border border-border bg-[var(--surface)] p-4">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!canAdmin || item.id === "dashboard"}
                        onChange={() => toggleBuiltInTab(item.id)}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary" />
                          <p className="font-medium text-foreground">{item.label}</p>
                        </div>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.description}</p>
                        {item.id === "dashboard" ? <p className="mt-2 text-xs font-semibold text-primary">Always visible</p> : null}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[24px] border border-border bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-6">
              <p className="text-sm font-medium text-foreground">Custom tabs</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Add society-specific links such as a shop, external wiki, Discord, sponsor portal, or competition dashboard.
              </p>
              <div className="mt-5 space-y-3">
                <Input value={newNavLabel} onChange={(event) => setNewNavLabel(event.target.value)} placeholder="Tab label, e.g. Shop" disabled={!canAdmin} />
                <Input value={newNavHref} onChange={(event) => setNewNavHref(event.target.value)} placeholder="/internal-page or https://example.com" disabled={!canAdmin} />
                <Button type="button" variant="outline" onClick={addCustomNavItem} disabled={!canAdmin || !newNavLabel.trim() || !newNavHref.trim()}>
                  <Plus className="h-4 w-4" />
                  Add custom tab
                </Button>
              </div>
              <div className="mt-6 space-y-3">
                {navigationConfig.customItems.length ? (
                  navigationConfig.customItems.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border bg-[var(--surface)] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{item.label}</p>
                          <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">{item.href}</p>
                        </div>
                        {canAdmin ? (
                          <button
                            type="button"
                            onClick={() => setNavigationConfig((current) => ({ ...current, customItems: current.customItems.filter((entry) => entry.id !== item.id) }))}
                            className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                      <label className="mt-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <input
                          type="checkbox"
                          checked={item.visibleToMembers}
                          disabled={!canAdmin}
                          onChange={(event) =>
                            setNavigationConfig((current) => ({
                              ...current,
                              customItems: current.customItems.map((entry) =>
                                entry.id === item.id ? { ...entry, visibleToMembers: event.target.checked } : entry
                              )
                            }))
                          }
                        />
                        Visible to members
                      </label>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-[var(--surface)] px-4 py-6 text-sm text-[var(--text-secondary)]">
                    No custom tabs yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="branding">
          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="rounded-[24px] border border-border bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-6">
              <p className="text-sm font-medium text-foreground">Logo preview</p>
              <div className="mt-4 flex aspect-square items-center justify-center rounded-[24px] border border-dashed border-border bg-[var(--surface-2)] p-6">
                {orgState.logo_url ? (
                  <img src={orgState.logo_url} alt={orgState.name} className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="text-center">
                    <Building2 className="mx-auto h-10 w-10 text-[var(--text-secondary)]" />
                    <p className="mt-3 text-sm text-[var(--text-secondary)]">No logo uploaded yet.</p>
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-[24px] border border-border bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-6">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-border bg-[var(--surface-2)] px-6 py-12 text-center">
                <ImagePlus className="h-6 w-6 text-[var(--text-secondary)]" />
                <div>
                  <p className="text-sm font-medium text-foreground">{logoFile ? logoFile.name : "Upload a new organization logo"}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">This replaces the current logo and stores it in Firebase Storage.</p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)} />
              </label>
              <div className="mt-5 flex justify-end">
                <Button onClick={() => void saveBranding()} disabled={savingBranding || !logoFile}>
                  {savingBranding ? "Saving..." : "Save branding"}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="roles">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-[24px] border border-border bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-6">
              <p className="text-sm font-medium text-foreground">Roles in this organization</p>
              <div className="mt-4 space-y-3">
                {allRoles.map((role) => {
                  const isBuiltIn = !("id" in role);

                  return (
                    <div key={`${role.name}-${role.permission_level}`} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-[var(--surface)] px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{role.name}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">{formatRoleLabel(role.permission_level)}</p>
                      </div>
                      {isBuiltIn ? (
                        <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                          Built in
                        </span>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => setDeleteRoleId((role as OrganizationRoleRecord).id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[24px] border border-border bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-6">
              <p className="text-sm font-medium text-foreground">Add custom role</p>
              <div className="mt-4 space-y-4">
                <Input value={newRoleName} onChange={(event) => setNewRoleName(event.target.value)} placeholder="For example: Welfare Lead" />
                <select value={newRolePermission} onChange={(event) => setNewRolePermission(event.target.value as PermissionLevel)} className="flex h-10 w-full rounded-lg border border-border bg-[var(--surface)] px-3 text-sm">
                  <option value="admin">Admin</option>
                  <option value="committee">Committee</option>
                  <option value="member">Member</option>
                </select>
                <Button onClick={() => void addRole()} disabled={savingRole || !newRoleName.trim()}>
                  <Plus className="h-4 w-4" />
                  Add custom role
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { title: "Google Drive integration", icon: FolderOpen, description: "Sync shared drive folders and keep operational docs linked automatically." },
              { title: "Slack integration", icon: Slack, description: "Push announcements, meeting reminders, and task updates into your workspace." },
              { title: "Calendar sync", icon: CalendarDays, description: "Mirror SocietyOS meetings and events into external calendars." }
            ].map((item) => (
              <div key={item.title} className="rounded-[24px] border border-border bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-6 opacity-80">
                <div className="flex items-center justify-between">
                  <item.icon className="h-6 w-6 text-primary" />
                  <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                    Coming soon
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.description}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="billing">
          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="rounded-[24px] border border-border bg-[linear-gradient(180deg,rgba(99,102,241,0.08),rgba(255,255,255,0.8))] p-6">
              <p className="text-sm font-medium text-foreground">Current plan</p>
              <h3 className="mt-2 text-3xl font-semibold text-foreground">Free</h3>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">Everything you need to get organized, with room to grow when your committee is ready.</p>
              <div className="mt-6 rounded-2xl border border-border bg-white/80 p-5">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Upgrade to Pro</p>
                    <p className="text-sm text-[var(--text-secondary)]">Unlock unlimited handovers, file storage, integrations, and priority support.</p>
                  </div>
                </div>
                <Button className="mt-5 w-full">Upgrade coming soon</Button>
              </div>
            </div>

            <div className="rounded-[24px] border border-border bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-6">
              <p className="text-sm font-medium text-foreground">Plan comparison</p>
              <div className="mt-4 overflow-hidden rounded-2xl border border-border">
                <div className="grid grid-cols-3 border-b border-border bg-[var(--surface-2)] px-4 py-3 text-sm font-semibold text-foreground">
                  <span>Feature</span>
                  <span>Free</span>
                  <span>Pro</span>
                </div>
                {[
                  ["Members", "Unlimited", "Unlimited"],
                  ["Core features", "Included", "Included"],
                  ["Active handovers", "3", "Unlimited"],
                  ["File storage", "Basic", "Expanded"],
                  ["Integrations", "No", "Yes"],
                  ["Support", "Standard", "Priority"]
                ].map(([feature, free, pro]) => (
                  <div key={feature} className="grid grid-cols-3 border-b border-border px-4 py-3 text-sm last:border-b-0">
                    <span className="font-medium text-foreground">{feature}</span>
                    <span className="text-[var(--text-secondary)]">{free}</span>
                    <span className="text-[var(--text-secondary)]">{pro}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="danger">
          <div className="rounded-[24px] border border-red-200 bg-[linear-gradient(180deg,rgba(254,242,242,0.9),rgba(255,255,255,0.9))] p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">Delete organization</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  This permanently deletes the organization and all related data, including tasks, meetings, resources, handovers, announcements, events, invites, and custom roles.
                </p>
                <div className="mt-5 max-w-md space-y-3">
                  <label className="text-sm font-medium text-foreground">Type <span className="font-semibold">{orgState.name}</span> to confirm</label>
                  <Input value={confirmName} onChange={(event) => setConfirmName(event.target.value)} />
                </div>
                <div className="mt-5">
                  <Button
                    variant="destructive"
                    onClick={() => void deleteOrganization()}
                    disabled={!canAdmin || deletingOrg || confirmName !== orgState.name}
                    className={cn(!canAdmin && "cursor-not-allowed opacity-60")}
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingOrg ? "Deleting..." : "Delete organization"}
                  </Button>
                </div>
                {!canAdmin ? <p className="mt-3 text-sm text-[var(--text-secondary)]">Only admins can delete the organization.</p> : null}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(deleteRoleId)} onOpenChange={(open) => !open && setDeleteRoleId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete custom role</DialogTitle>
            <DialogDescription>This removes the custom role from the organization configuration.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 p-6 pt-2">
            <Button variant="ghost" onClick={() => setDeleteRoleId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void removeRole()}>
              Delete role
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
