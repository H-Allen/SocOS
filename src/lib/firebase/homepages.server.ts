import "server-only";

import { z } from "zod";

import { homepageContentSchema, type HomepageContent } from "@/domain/homepage";
import { HYPED_SOCIETY_ID } from "@/domain/hyped";
import { getAdminFirestore } from "@/lib/firebase/admin";

const homepageDocumentSchema = z.object({
  content: homepageContentSchema,
  revision: z.number().int().min(1),
  status: z.literal("published"),
  updatedBy: z.string().min(1),
});

export async function getPublishedHomepage(): Promise<HomepageContent | null> {
  const snapshot = await getAdminFirestore().doc(`societies/${HYPED_SOCIETY_ID}/homepages/published`).get();
  if (!snapshot.exists) return null;
  const parsed = homepageDocumentSchema.parse(snapshot.data());
  return parsed.content;
}
