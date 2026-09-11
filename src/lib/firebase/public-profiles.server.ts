import "server-only";

import { z } from "zod";

import { HYPED_SOCIETY_ID } from "@/domain/hyped";
import { publicProfileContentSchema, type PublicProfileView } from "@/domain/public-profiles";
import { getAdminFirestore } from "@/lib/firebase/admin";

const publishedProfileSchema = publicProfileContentSchema.extend({ revision: z.number().int().min(1) });
const profileDocumentSchema = z.object({
  published: publishedProfileSchema.nullable(),
  revision: z.number().int().min(1),
  visibility: z.enum(["published", "hidden"]),
});

export async function listPublicProfiles(): Promise<PublicProfileView[]> {
  try {
    const snapshot = await getAdminFirestore().collection(`societies/${HYPED_SOCIETY_ID}/publicProfiles`).get();
    const profiles = snapshot.docs.flatMap((document) => {
      const profile = toView(document.id, document.data());
      return profile ? [profile] : [];
    }).sort((left, right) => left.order - right.order || left.displayName.localeCompare(right.displayName));
    if (profiles.length) return profiles;
  } catch {
    // An empty directory is safer than publishing unverified personal data.
  }
  return [];
}

function toView(id: string, raw: unknown): PublicProfileView | null {
  const result = profileDocumentSchema.safeParse(raw);
  if (!result.success) return null;
  const parsed = result.data;
  if (!parsed.published || parsed.visibility !== "published") return null;
  const profile = parsed.published;
  return {
    bio: profile.bio,
    displayName: profile.displayName,
    expertise: profile.expertise,
    id,
    order: profile.order,
    photoURL: profile.photoURL,
    responsibilities: profile.responsibilities,
    role: profile.role,
    roleTitle: profile.roleTitle,
    teamIds: profile.teamIds,
  };
}
