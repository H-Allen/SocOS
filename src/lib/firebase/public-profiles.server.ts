import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

import { HYPED_SOCIETY_ID, hypedPublicPeople } from "@/domain/hyped";
import { publicProfileContentSchema, type PublicProfileView } from "@/domain/public-profiles";
import { getAdminFirestore } from "@/lib/firebase/admin";

const publishedProfileSchema = publicProfileContentSchema.extend({ revision: z.number().int().min(1) });
const profileDocumentSchema = z.object({
  published: publishedProfileSchema.nullable(),
  revision: z.number().int().min(1),
  visibility: z.enum(["published", "hidden"]),
});

export async function listPublicProfiles(societyId: string): Promise<PublicProfileView[]> {
  try {
    const snapshot = await getAdminFirestore().collection(`societies/${societyId}/publicProfiles`).get();
    const profiles = snapshot.docs.flatMap((document) => {
      const profile = toView(document.id, document.data());
      return profile ? [profile] : [];
    }).sort((left, right) => left.order - right.order || left.displayName.localeCompare(right.displayName));
    if (profiles.length) return profiles;
  } catch {
    // The public HYPED directory has a built-in fallback so the site stays useful without Firebase.
  }
  return societyId === HYPED_SOCIETY_ID ? hypedPublicPeople : [];
}

function toView(id: string, raw: unknown): PublicProfileView | null {
  const parsed = profileDocumentSchema.parse(raw);
  if (!parsed.published || parsed.visibility !== "published") return null;
  const timestamps = raw as { publishedAt?: unknown };
  const publishedAt = timestamps.publishedAt instanceof Timestamp ? timestamps.publishedAt.toDate().toISOString() : null;
  return {
    ...parsed.published,
    hasUnpublishedChanges: false,
    id,
    publishedAt,
    publishedRevision: parsed.published.revision,
    revision: parsed.published.revision,
    updatedAt: publishedAt,
    visibility: "published",
  };
}
