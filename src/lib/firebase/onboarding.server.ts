import "server-only";

import { z } from "zod";

import { HYPED_SOCIETY_ID } from "@/domain/hyped";
import { createDefaultOnboardingGuide, onboardingGuideContentSchema, type OnboardingGuideView } from "@/domain/onboarding";
import { getAdminFirestore } from "@/lib/firebase/admin";

const guideDocumentSchema = z.object({
  guide: onboardingGuideContentSchema,
  revision: z.number().int().min(1),
  updatedBy: z.string().min(1),
});

export async function getOnboardingGuide(): Promise<OnboardingGuideView> {
  try {
    const snapshot = await getAdminFirestore().doc(`societies/${HYPED_SOCIETY_ID}/onboarding/guide`).get();
    if (!snapshot.exists) return defaultGuide();
    const parsed = guideDocumentSchema.parse(snapshot.data());
    return parsed.guide;
  } catch {
    return defaultGuide();
  }
}

function defaultGuide(): OnboardingGuideView {
  return createDefaultOnboardingGuide();
}
