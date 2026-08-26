import { describe, expect, it } from "vitest";

import {
  createDefaultOnboardingGuide,
  onboardingGuideContentSchema,
} from "@/domain/onboarding";

describe("onboarding guide", () => {
  it("creates a useful valid first-two-weeks route", () => {
    const guide = createDefaultOnboardingGuide("Robotics Society");
    expect(onboardingGuideContentSchema.parse(guide)).toEqual(guide);
    expect(guide.title).toContain("Robotics Society");
    expect(guide.steps.some((step) => step.phase === "firstFortnight")).toBe(true);
    expect(guide.steps.filter((step) => step.required).length).toBeGreaterThan(3);
  });

  it("rejects duplicate step identities", () => {
    const guide = createDefaultOnboardingGuide("HYPED");
    guide.steps[1] = { ...guide.steps[1], id: guide.steps[0].id };
    expect(onboardingGuideContentSchema.safeParse(guide).success).toBe(false);
  });
});
