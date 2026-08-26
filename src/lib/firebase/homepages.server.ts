import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

import { homepageContentSchema, type HomepageContent } from "@/domain/homepage";
import { getAdminFirestore } from "@/lib/firebase/admin";

const homepageDocumentSchema = z.object({
  content: homepageContentSchema,
  revision: z.number().int().min(1),
  status: z.literal("published"),
  updatedBy: z.string().min(1),
});

export type HomepageDocument = {
  content: HomepageContent;
  revision: number;
  updatedAt: string | null;
};

export async function getHomepage(societyId: string, version: "published"): Promise<HomepageDocument | null> {
  const snapshot = await getAdminFirestore().doc(`societies/${societyId}/homepages/${version}`).get();
  if (!snapshot.exists) return null;
  const parsed = homepageDocumentSchema.parse(snapshot.data());
  const updatedAt = snapshot.data()?.updatedAt;
  return {
    content: parsed.content,
    revision: parsed.revision,
    updatedAt: updatedAt instanceof Timestamp ? updatedAt.toDate().toISOString() : null,
  };
}
