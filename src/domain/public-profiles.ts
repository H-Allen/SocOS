import { z } from "zod";

const listItem = z.string().trim().min(1).max(80);
export const publicRoles = ["member", "teamLead", "editor", "admin", "owner"] as const;

export const publicProfileContentSchema = z.object({
  bio: z.string().trim().max(600),
  consentConfirmed: z.boolean(),
  displayName: z.string().trim().min(1).max(100),
  expertise: z.array(listItem).max(24),
  order: z.number().int().min(0).max(999),
  photoURL: z.url().nullable(),
  responsibilities: z.array(listItem).max(24),
  role: z.enum(publicRoles),
  roleTitle: z.string().trim().min(1).max(100),
  teamIds: z.array(listItem).max(16),
}).strict();

export const publicProfileViewSchema = publicProfileContentSchema.extend({
  hasUnpublishedChanges: z.boolean(),
  id: z.string().min(1).max(128),
  publishedAt: z.iso.datetime().nullable(),
  publishedRevision: z.number().int().min(1).nullable(),
  revision: z.number().int().min(1),
  updatedAt: z.iso.datetime().nullable(),
  visibility: z.enum(["published", "hidden"]),
});

export type PublicProfileContent = z.infer<typeof publicProfileContentSchema>;
export type PublicProfileView = z.infer<typeof publicProfileViewSchema>;
