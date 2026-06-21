"use client";

import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, CheckCircle2, ImagePlus, Sparkles, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";

import { sendInvites, type InviteResult } from "@/app/actions/invite";
import { createOrganizationWithMembership, seedTemplate } from "@/app/actions/onboarding";
import { ACTIVE_ORG_STORAGE_KEY } from "@/lib/org-state";
import { createBrowserBackendClient } from "@/lib/backend/client";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/cn";
import type { OrganizationType } from "@/types";

const stepOneSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters."),
  university: z.string().min(2, "University name is required."),
  type: z.enum(["sports_club", "engineering_team", "academic_society", "finance_society", "social_club", "other"])
});

type StepOneValues = z.infer<typeof stepOneSchema>;

type OnboardingWizardProps = {
  userId: string;
  userName: string | null;
};

type InviteStatus = InviteResult;

type TemplateDefinition = {
  label: string;
  value: Exclude<OrganizationType, "other">;
  description: string;
  preview: string;
};

const organizationTypeOptions: Array<{ label: string; value: OrganizationType }> = [
  { label: "Sports Club", value: "sports_club" },
  { label: "Engineering Team", value: "engineering_team" },
  { label: "Academic Society", value: "academic_society" },
  { label: "Finance Society", value: "finance_society" },
  { label: "Social Club", value: "social_club" },
  { label: "Other", value: "other" }
];

const templateCards: TemplateDefinition[] = [
  {
    label: "Sports Club",
    value: "sports_club",
    description: "Training, match-day prep, and committee logistics for sport-led societies.",
    preview: "Seeds player coordination tasks, a kickoff meeting, and captain handover stubs."
  },
  {
    label: "Engineering Team",
    value: "engineering_team",
    description: "Built for competition teams and makerspaces managing projects and sponsors.",
    preview: "Seeds technical milestones, build review meetings, and leads handover stubs."
  },
  {
    label: "Academic Society",
    value: "academic_society",
    description: "Great for speaker events, revision sessions, and academic programming.",
    preview: "Seeds speaker outreach tasks, committee planning, and welfare handover stubs."
  },
  {
    label: "Finance Society",
    value: "finance_society",
    description: "Designed for careers events, analyst programs, and sponsor coordination.",
    preview: "Seeds partner outreach tasks, events planning, and treasurer handover stubs."
  },
  {
    label: "Social Club",
    value: "social_club",
    description: "A flexible starting point for member engagement, socials, and community events.",
    preview: "Seeds launch tasks, social planning, and community handover stubs."
  }
];

function getTemplateValue(type: OrganizationType | null): TemplateDefinition["value"] {
  if (type && templateCards.some((template) => template.value === type)) {
    return type as TemplateDefinition["value"];
  }

  return "academic_society";
}

const templateSeeds: Record<
  TemplateDefinition["value"],
  {
    tasks: Array<{ title: string; description: string; priority: "low" | "medium" | "high"; dueOffsetDays: number }>;
    meeting: { title: string; description: string; startOffsetDays: number };
    handovers: string[];
    announcement: { title: string; content: string };
  }
> = {
  sports_club: {
    tasks: [
      { title: "Confirm weekly training schedule", description: "Lock in sessions, venue access, and communication to members.", priority: "high", dueOffsetDays: 2 },
      { title: "Publish fixtures and selection timeline", description: "Share match logistics, availability deadlines, and squad expectations.", priority: "medium", dueOffsetDays: 4 },
      { title: "Review equipment and kit stock", description: "Audit essential equipment, replacements, and storage needs.", priority: "medium", dueOffsetDays: 6 }
    ],
    meeting: { title: "Season launch committee meeting", description: "Set priorities for training, fixtures, welfare, and membership comms.", startOffsetDays: 3 },
    handovers: ["President", "Secretary", "Treasurer"],
    announcement: { title: "Welcome to your club workspace", content: "This starter setup gives your committee a clean place to manage training, fixtures, and operational handovers." }
  },
  engineering_team: {
    tasks: [
      { title: "Define subsystem leads and owners", description: "Assign responsible leads for mechanical, electrical, software, and operations.", priority: "high", dueOffsetDays: 2 },
      { title: "Prepare sponsor outreach list", description: "Compile target companies, packages, and ownership for outreach.", priority: "medium", dueOffsetDays: 5 },
      { title: "Schedule first design review", description: "Book time for the team to align on technical milestones and blockers.", priority: "high", dueOffsetDays: 7 }
    ],
    meeting: { title: "Project kickoff sync", description: "Align on milestones, subsystem scope, and sponsor strategy for the term.", startOffsetDays: 2 },
    handovers: ["President", "Secretary", "Treasurer"],
    announcement: { title: "Engineering team starter loaded", content: "You now have a structured workspace for project planning, reviews, and sponsor operations." }
  },
  academic_society: {
    tasks: [
      { title: "Reach out to first guest speaker", description: "Confirm a speaker for the society’s launch event and gather availability.", priority: "high", dueOffsetDays: 3 },
      { title: "Plan first revision or discussion session", description: "Choose a topic, host, and date for your first member-facing session.", priority: "medium", dueOffsetDays: 6 },
      { title: "Draft term calendar", description: "Sketch out key events, collaborations, and committee checkpoints.", priority: "medium", dueOffsetDays: 8 }
    ],
    meeting: { title: "Academic programming planning", description: "Shape the term calendar, speaker pipeline, and member experience.", startOffsetDays: 4 },
    handovers: ["President", "Secretary", "Treasurer"],
    announcement: { title: "Academic society workspace ready", content: "Your starter plan includes sample programming tasks and handovers to help the committee get moving fast." }
  },
  finance_society: {
    tasks: [
      { title: "Outline flagship careers event", description: "Define target format, speaker wishlist, and delivery owners.", priority: "high", dueOffsetDays: 3 },
      { title: "Build sponsor and alumni contact list", description: "Gather key employer, alumni, and speaker contacts for outreach.", priority: "high", dueOffsetDays: 5 },
      { title: "Create analyst program content plan", description: "Plan workshops, prep sessions, and member content for the term.", priority: "medium", dueOffsetDays: 8 }
    ],
    meeting: { title: "Careers term planning session", description: "Set the event calendar, employer outreach plan, and member value proposition.", startOffsetDays: 2 },
    handovers: ["President", "Secretary", "Treasurer"],
    announcement: { title: "Finance society starter live", content: "The workspace now includes sample planning data for employer outreach, careers events, and role handovers." }
  },
  social_club: {
    tasks: [
      { title: "Plan your first social", description: "Pick a format, venue, and RSVP timeline for your first welcome event.", priority: "high", dueOffsetDays: 4 },
      { title: "Set member communication rhythm", description: "Choose where updates go and who owns weekly community comms.", priority: "medium", dueOffsetDays: 3 },
      { title: "Create term highlights list", description: "Capture the experiences and milestones you want members to remember.", priority: "low", dueOffsetDays: 9 }
    ],
    meeting: { title: "Community launch planning", description: "Align on socials, community standards, and member engagement for the first month.", startOffsetDays: 3 },
    handovers: ["President", "Secretary", "Treasurer"],
    announcement: { title: "Your social club workspace is set", content: "You’re ready to plan events, keep the committee aligned, and build better continuity across years." }
  }
};

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toIso(date: Date) {
  return date.toISOString();
}

export function OnboardingWizard({ userId, userName }: OnboardingWizardProps) {
  const router = useRouter();
  const backend = useMemo(() => createBrowserBackendClient(), []);
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [inviteInput, setInviteInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<"signup" | null>(null);
  const [inviteStatuses, setInviteStatuses] = useState<InviteStatus[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDefinition["value"] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stepOneForm = useForm<StepOneValues>({
    resolver: zodResolver(stepOneSchema),
    defaultValues: {
      name: "",
      university: "",
      type: "academic_society"
    }
  });

  const progress = (step / 3) * 100;

  const handleCreateOrganization = stepOneForm.handleSubmit(async (values) => {
    setErrorMessage(null);
    setIsSubmitting("signup");

    try {
      // Upload logo from browser (storage operation — types correctly with browser client)
      let logoUrl: string | null = null;
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop() ?? "png";
        const filePath = `${userId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await backend.storage.from("org-logos").upload(filePath, logoFile);
        if (uploadError) throw uploadError;
        const { data } = await backend.storage.from("org-logos").createSignedUrl(filePath);
        logoUrl = data.signedUrl;
      }

      // All Postgres writes happen in a Server Action (typed correctly server-side)
      const { organizationId: newOrgId, error: createError } = await createOrganizationWithMembership({
        name: values.name,
        university: values.university,
        type: values.type,
        logoUrl,
        userId
      });

      if (createError) throw new Error(createError);

      setOrganizationId(newOrgId);
      setStep(2);
    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : "Failed to create organization. Please try again.");
    } finally {
      setIsSubmitting(null);
    }
  });

  const handleInvites = () => {
    startTransition(async () => {
      if (!organizationId) {
        setErrorMessage("Create your organization before sending invites.");
        return;
      }

      setErrorMessage(null);

      const emails = inviteInput
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);

      if (!emails.length) {
        setInviteStatuses([]);
        setStep(3);
        return;
      }

      // Use the Server Action — validates permissions, caps at 20,
      // stores invite records, and logs the batch for a Firebase Function email worker.
      const { results, error } = await sendInvites(organizationId, emails);

      if (error) {
        setErrorMessage(error);
        return;
      }

      setInviteStatuses(results);
      setStep(3);
    });
  };

  const handleSeedTemplate = () => {
    startTransition(async () => {
      if (!organizationId || !selectedTemplate) {
        setErrorMessage("Choose a starter template to continue.");
        return;
      }

      setErrorMessage(null);

      const template = templateSeeds[selectedTemplate];

      // All DB writes via Server Action — correctly typed server-side
      const { error: seedError } = await seedTemplate({
        organizationId,
        userId,
        templateKey: selectedTemplate,
        tasks: template.tasks,
        meeting: template.meeting,
        handoverRoles: template.handovers,
        announcement: template.announcement
      });

      if (seedError) {
        setErrorMessage(seedError);
        return;
      }

      // Persist active org so the dashboard loads into the right org
      window.localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, organizationId);

      router.push("/dashboard");
      router.refresh();
    });
  };

  return (
    <div className="w-full max-w-lg rounded-[28px] bg-white text-[#111118] shadow-2xl shadow-black/20">
      <CardHeader className="space-y-5 border-b border-[#e4e4ec] p-8">
        <div className="flex items-center justify-between text-sm text-[#6b6b7a]">
          <span>
            Step {step} of 3
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#f5f5fb] px-3 py-1 text-xs font-medium text-[#525269]">
            <Sparkles className="h-3.5 w-3.5" />
            {userName ? `${userName.split(" ")[0]}'s setup` : "Getting started"}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#ececf3]">
          <div className="h-full rounded-full bg-[#6366f1] transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div>
          <CardTitle className="text-3xl text-[#111118]">
            {step === 1 && "Create your organization"}
            {step === 2 && "Invite your team"}
            {step === 3 && "Choose a starter template"}
          </CardTitle>
          <p className="mt-2 text-sm leading-relaxed text-[#6b6b7a]">
            {step === 1 && "Set up the basics for your society workspace and create the first admin account."}
            {step === 2 && "Bring your committee in now, or skip and invite them once you’re inside the product."}
            {step === 3 && "Start with a tailored operating template so your dashboard feels useful from day one."}
          </p>
        </div>
      </CardHeader>

      <CardContent className="p-8">
        {errorMessage ? (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
        ) : null}

        <Form {...stepOneForm}>
          {step === 1 ? (
            <form key="step-1" className="animate-step-in space-y-5" onSubmit={handleCreateOrganization}>
              <FormField
                control={stepOneForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Imperial Formula Student" disabled={Boolean(organizationId) || isPending} className="border-[#d9d9e4] bg-white text-[#111118] placeholder:text-[#9b9ba8] focus-visible:ring-[#6366f1] focus-visible:ring-offset-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={stepOneForm.control}
                name="university"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>University name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="University of Bristol" disabled={Boolean(organizationId) || isPending} className="border-[#d9d9e4] bg-white text-[#111118] placeholder:text-[#9b9ba8] focus-visible:ring-[#6366f1] focus-visible:ring-offset-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={stepOneForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        disabled={Boolean(organizationId) || isPending}
                        className="flex h-10 w-full rounded-lg border border-[#d9d9e4] bg-white px-3 py-2 text-sm text-[#111118] outline-none focus:ring-2 focus:ring-[#6366f1]"
                      >
                        {organizationTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label>Logo upload</Label>
                <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-[#d9d9e4] bg-[#fafafe] px-4 py-4 transition-colors hover:border-[#b9b9cf]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef0ff] text-[#6366f1]">
                      <ImagePlus className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#111118]">{logoFile ? logoFile.name : "Upload organization logo"}</p>
                      <p className="text-xs text-[#6b6b7a]">Optional. Stored in Firebase Storage.</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#4f46e5]">Choose file</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={Boolean(organizationId) || isPending}
                    onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button type="button" variant="ghost" disabled className="text-[#9b9ba8] hover:bg-transparent hover:text-[#9b9ba8]">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" disabled={isPending} className="min-w-[180px] bg-[#6366f1] text-white hover:bg-[#4f46e5]">
                  <Building2 className="h-4 w-4" />
                  {organizationId ? "Organization created" : isPending ? "Creating..." : "Create organization"}
                </Button>
              </div>
            </form>
          ) : null}
        </Form>

        {step === 2 ? (
          <div key="step-2" className="animate-step-in space-y-5">
            <div className="rounded-2xl border border-[#e4e4ec] bg-[#f8f8fb] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef0ff] text-[#6366f1]">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#111118]">Invite the rest of your committee</p>
                  <p className="mt-1 text-sm text-[#6b6b7a]">
                    Add email addresses separated by commas. We&apos;ll save pending invites so you can build on this later.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email addresses</Label>
              <Textarea
                value={inviteInput}
                onChange={(event) => setInviteInput(event.target.value)}
                placeholder="president@society.com, treasurer@society.com, welfare@society.com"
                className="min-h-[140px] border-[#d9d9e4] bg-white text-[#111118] placeholder:text-[#9b9ba8] focus-visible:ring-[#6366f1] focus-visible:ring-offset-white"
              />
            </div>

            {inviteStatuses.length ? (
              <div className="space-y-2 rounded-2xl border border-[#e4e4ec] bg-[#fafafe] p-4">
                {inviteStatuses.map((invite) => (
                  <div key={invite.email} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-[#111118]">{invite.email}</p>
                      <p className="text-xs text-[#6b6b7a]">{invite.message}</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium",
                        invite.status === "success" && "bg-emerald-100 text-emerald-700",
                        invite.status === "duplicate" && "bg-amber-100 text-amber-700",
                        invite.status === "error" && "bg-red-100 text-red-700"
                      )}
                    >
                      {invite.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex items-center justify-between pt-4">
              <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={isPending} className="text-[#6b6b7a] hover:bg-[#f5f5fb] hover:text-[#111118]">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(3)} disabled={isPending} className="border-[#d9d9e4] bg-white text-[#111118] hover:bg-[#f5f5fb]">
                  Skip for now
                </Button>
                <Button type="button" onClick={handleInvites} disabled={isPending} className="min-w-[150px] bg-[#6366f1] text-white hover:bg-[#4f46e5]">
                  {isPending ? "Saving..." : "Continue"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div key="step-3" className="animate-step-in space-y-5">
            <div className="grid gap-3">
              {templateCards.map((template) => {
                const isSelected = selectedTemplate === template.value;

                return (
                  <button
                    key={template.value}
                    type="button"
                    onClick={() => setSelectedTemplate(template.value)}
                    className={cn(
                      "rounded-2xl border px-4 py-4 text-left transition-all",
                      isSelected
                        ? "border-[#6366f1] bg-[#eef0ff] shadow-sm shadow-[#cfd3ff]"
                        : "border-[#e4e4ec] bg-white hover:border-[#cfd3ff] hover:bg-[#fafafe]"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl", isSelected ? "bg-white text-[#6366f1]" : "bg-[#f5f5fb] text-[#6b6b7a]")}>
                        <BadgeCheck className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-[#111118]">{template.label}</p>
                          {isSelected ? <CheckCircle2 className="h-4 w-4 text-[#6366f1]" /> : null}
                        </div>
                        <p className="mt-1 text-sm text-[#6b6b7a]">{template.description}</p>
                        <p className="mt-2 text-xs text-[#8d8d99]">{template.preview}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-[#e4e4ec] bg-[#f8f8fb] px-4 py-3 text-sm text-[#6b6b7a]">
              We&apos;ll seed 3-5 starter tasks, one sample meeting, a few handover stubs, and a welcome announcement.
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button type="button" variant="ghost" onClick={() => setStep(2)} disabled={isPending} className="text-[#6b6b7a] hover:bg-[#f5f5fb] hover:text-[#111118]">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                type="button"
                onClick={handleSeedTemplate}
                disabled={isPending || !selectedTemplate}
                className="min-w-[180px] bg-[#6366f1] text-white hover:bg-[#4f46e5]"
              >
                {isPending ? "Finishing..." : "Complete setup"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </div>
  );
}
