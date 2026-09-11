import { z } from "zod";

import { HYPED_SOCIETY_NAME } from "@/domain/hyped";

export const onboardingStepIdSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,79}$/);
export const onboardingPhaseSchema = z.enum(["firstDay", "firstWeek", "firstFortnight"]);

export const onboardingDestinationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("home"), label: z.string().trim().min(1).max(40) }),
  z.object({ kind: z.literal("people"), label: z.string().trim().min(1).max(40) }),
  z.object({ kind: z.literal("teams"), label: z.string().trim().min(1).max(40) }),
  z.object({
    kind: z.literal("wiki"),
    label: z.string().trim().min(1).max(40),
    pageId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/),
  }),
  z.object({
    kind: z.literal("external"),
    label: z.string().trim().min(1).max(40),
    url: z.url().refine((value) => new URL(value).protocol === "https:"),
  }),
]);

export const onboardingStepSchema = z.object({
  id: onboardingStepIdSchema,
  title: z.string().trim().min(1).max(100),
  summary: z.string().trim().min(1).max(280),
  why: z.string().trim().max(280),
  phase: onboardingPhaseSchema,
  estimatedMinutes: z.number().int().min(1).max(240),
  required: z.boolean(),
  destination: onboardingDestinationSchema,
});

export const onboardingGuideContentSchema = z.object({
  title: z.string().trim().min(1).max(100),
  introduction: z.string().trim().min(1).max(600),
  outcome: z.string().trim().min(1).max(300),
  steps: z.array(onboardingStepSchema).min(1).max(30).superRefine((steps, context) => {
    const ids = new Set<string>();
    steps.forEach((step, index) => {
      if (ids.has(step.id)) {
        context.addIssue({
          code: "custom",
          message: "Step IDs must be unique",
          path: [index, "id"],
        });
      }
      ids.add(step.id);
    });
  }),
});

export type OnboardingDestination = z.infer<typeof onboardingDestinationSchema>;
export type OnboardingGuideContent = z.infer<typeof onboardingGuideContentSchema>;
export type OnboardingGuideView = OnboardingGuideContent;
export type OnboardingPhase = z.infer<typeof onboardingPhaseSchema>;
export type OnboardingStep = z.infer<typeof onboardingStepSchema>;

export const onboardingPhaseLabels: Record<OnboardingPhase, string> = {
  firstDay: "Your first day",
  firstWeek: "Your first week",
  firstFortnight: "Your first fortnight",
};

export function createDefaultOnboardingGuide(): OnboardingGuideContent {
  return onboardingGuideContentSchema.parse({
    title: `Getting started with ${HYPED_SOCIETY_NAME}`,
    introduction: "A short checklist for understanding the project, finding your team and agreeing your first piece of work. Progress is stored only in this browser.",
    outcome: "You understand the project, know where its documentation lives and have agreed a first task with your team.",
    steps: [
      step("read-the-overview", "Read the project overview", "Start with the Wiki home page and follow the links relevant to your area.", "This gives you the vocabulary and context used in team discussions.", "firstDay", 10, true, { kind: "wiki", label: "Open the technical Wiki", pageId: "Home" }),
      step("choose-a-team", "Identify your team", "Check the current team list and note what the team owns.", "Clear ownership makes it easier to find the right work and the right reviewer.", "firstDay", 5, true, { kind: "teams", label: "View teams" }),
      step("find-your-contact", "Find your team contact", "Use the published directory to find the team lead or another named contact.", "You need a real person to confirm access, priorities and safety requirements.", "firstWeek", 5, true, { kind: "people", label: "Open the directory" }),
      step("read-team-documentation", "Read your team documentation", "Review the setup, architecture and operating notes linked from your team page.", "The Wiki is the source of truth for technical procedures.", "firstWeek", 20, true, { kind: "wiki", label: "Browse the Wiki", pageId: "Home" }),
      step("agree-first-task", "Agree your first task", "Ask your team contact for a small task with a clear result and reviewer.", "A scoped task is easier to complete and gives the team something it can verify.", "firstFortnight", 20, true, { kind: "people", label: "Find a contact" }),
    ],
  });
}

function step(
  id: string,
  title: string,
  summary: string,
  why: string,
  phase: OnboardingPhase,
  estimatedMinutes: number,
  required: boolean,
  destination: OnboardingDestination,
): OnboardingStep {
  return { id, title, summary, why, phase, estimatedMinutes, required, destination };
}
