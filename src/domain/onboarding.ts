import { z } from "zod";

export const onboardingStepIdSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,79}$/);
export const onboardingPhaseSchema = z.enum(["firstDay", "firstWeek", "firstFortnight"]);

export const onboardingDestinationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("home"), label: z.string().trim().min(1).max(40) }),
  z.object({ kind: z.literal("people"), label: z.string().trim().min(1).max(40) }),
  z.object({
    kind: z.literal("wiki"),
    label: z.string().trim().min(1).max(40),
    pageId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/),
  }),
  z.object({
    kind: z.literal("external"),
    label: z.string().trim().min(1).max(40),
    url: z.url().refine((value) => ["https:", "http:"].includes(new URL(value).protocol)),
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

export const onboardingGuideViewSchema = onboardingGuideContentSchema.extend({
  revision: z.number().int().min(0),
  updatedAt: z.iso.datetime().nullable(),
  updatedBy: z.string().nullable(),
});

export type OnboardingDestination = z.infer<typeof onboardingDestinationSchema>;
export type OnboardingGuideContent = z.infer<typeof onboardingGuideContentSchema>;
export type OnboardingGuideView = z.infer<typeof onboardingGuideViewSchema>;
export type OnboardingPhase = z.infer<typeof onboardingPhaseSchema>;
export type OnboardingStep = z.infer<typeof onboardingStepSchema>;

export const onboardingPhaseLabels: Record<OnboardingPhase, string> = {
  firstDay: "Your first day",
  firstWeek: "Your first week",
  firstFortnight: "Your first fortnight",
};

export function createDefaultOnboardingGuide(societyName: string): OnboardingGuideContent {
  return onboardingGuideContentSchema.parse({
    title: `Find your place in ${societyName}`,
    introduction: `${societyName} is more than a list of tasks. This short route gives you the context, people and first contribution you need to feel part of the society.`,
    outcome: "By the end, you should understand the shared goal, know who to ask for help and have one useful piece of work underway.",
    steps: [
      step("understand-the-mission", "Understand what we are building", "Start with the purpose, the project and the reason every team is here.", "Context makes even a small starter task feel useful.", "firstDay", 8, true, { kind: "wiki", label: "Open the technical Wiki", pageId: "Home" }),
      step("meet-the-people", "Know who to ask", "Find your team lead and two people outside your own team.", "Knowing names early makes asking for help much easier.", "firstDay", 10, true, { kind: "people", label: "Open People", }),
      step("join-the-conversation", "Join the conversation", "Get into the society Discord and introduce yourself to your team.", "The hub gives context; conversation is where the society becomes friendly.", "firstDay", 5, true, { kind: "external", label: "Open Discord", url: "https://discord.com" }),
      step("see-the-whole-system", "See the whole system", "Learn how the teams connect and where your work fits into the final result.", "A software, mechanical or outreach task only makes sense as part of the same system.", "firstWeek", 12, true, { kind: "wiki", label: "Open the system overview", pageId: "general_overview" }),
      step("learn-your-team", "Learn how your team works", "Read your team’s technical pages, find its tools and understand what it owns.", "Good onboarding should not rely on somebody remembering every setup detail.", "firstWeek", 20, true, { kind: "wiki", label: "Browse technical sections", pageId: "Home" }),
      step("shape-your-profile", "Learn who can help", "Find the people who own the areas you will work with.", "Knowing who to ask makes it much easier to get unstuck.", "firstWeek", 5, false, { kind: "people", label: "Open People" }),
      step("start-something-useful", "Start one useful contribution", "Agree a small, real first task with your lead and understand who benefits from it.", "Finishing something meaningful is the quickest route to confidence and belonging.", "firstFortnight", 30, true, { kind: "people", label: "Find your team lead" }),
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
