import { z } from "zod";

export const teamIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);
const wikiPageIdSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/);

export const teamConnectionSchema = z.object({
  reason: z.string().trim().min(1).max(180),
  teamId: teamIdSchema,
});

export const teamContentSchema = z.object({
  currentFocus: z.string().trim().min(1).max(220),
  icon: z.string().trim().min(1).max(8),
  leadUserId: z.string().min(1).max(128).nullable(),
  name: z.string().trim().min(2).max(80),
  order: z.number().int().min(0).max(1000),
  owns: z.array(z.string().trim().min(1).max(100)).min(1).max(12),
  purpose: z.string().trim().min(1).max(300),
  summary: z.string().trim().min(1).max(180),
  wikiPageId: wikiPageIdSchema.nullable(),
  connections: z.array(teamConnectionSchema).max(12).superRefine((connections, context) => {
    const seen = new Set<string>();
    connections.forEach((connection, index) => {
      if (seen.has(connection.teamId)) {
        context.addIssue({ code: "custom", message: "Each connected team can appear once", path: [index, "teamId"] });
      }
      seen.add(connection.teamId);
    });
  }),
});

export const teamViewSchema = teamContentSchema.extend({
  id: teamIdSchema,
});

export type TeamView = z.infer<typeof teamViewSchema>;
