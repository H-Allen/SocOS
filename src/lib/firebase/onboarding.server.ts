import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

import { createDefaultOnboardingGuide, onboardingGuideContentSchema, type OnboardingGuideView } from "@/domain/onboarding";
import { getAdminFirestore } from "@/lib/firebase/admin";

const guideDocumentSchema = z.object({
  guide: onboardingGuideContentSchema,
  revision: z.number().int().min(1),
  updatedBy: z.string().min(1),
});

export async function getOnboardingGuide(societyId: string, societyName: string): Promise<OnboardingGuideView> {
  try {
    const snapshot = await getAdminFirestore().doc(`societies/${societyId}/onboarding/guide`).get();
    if (!snapshot.exists) return defaultGuide(societyName);
    const parsed = guideDocumentSchema.parse(snapshot.data());
    const updatedAt = snapshot.data()?.updatedAt;
    return {
      ...parsed.guide,
      revision: parsed.revision,
      updatedAt: updatedAt instanceof Timestamp ? updatedAt.toDate().toISOString() : null,
      updatedBy: parsed.updatedBy,
    };
  } catch {
    return defaultGuide(societyName);
  }
}

function defaultGuide(societyName: string): OnboardingGuideView {
  return { ...createDefaultOnboardingGuide(societyName), revision: 0, updatedAt: null, updatedBy: null };
}
