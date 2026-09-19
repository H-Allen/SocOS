import { z } from "zod";
import type { GithubWikiSnapshot } from "@/lib/github-wiki.server";

const navigation = z.array(z.object({
  icon: z.string(), id: z.string(), kind: z.enum(["directory", "page"]),
  pageId: z.string().nullable(), parentId: z.string().nullable(), title: z.string(),
}));
export const snapshotSchema = z.object({
  indexNavigation: navigation,
  navigation,
  pages: z.array(z.object({
    childrenIds: z.array(z.string()), githubUrl: z.string(), html: z.string(), icon: z.string(),
    headings: z.array(z.object({ id: z.string(), level: z.union([z.literal(1), z.literal(2), z.literal(3)]), title: z.string() })),
    id: z.string(), navigationTitle: z.string(), outgoingIds: z.array(z.string()),
    parentId: z.string().nullable(), summary: z.string(), text: z.string(), title: z.string(), updatedAt: z.string().nullable(),
  })).min(1),
  sourceUrl: z.string(), status: z.enum(["live", "partial", "unavailable"]), syncedAt: z.string().datetime(),
});

export function validateSnapshot(value: unknown, sourceUrl: string): GithubWikiSnapshot {
  const snapshot = snapshotSchema.parse(value);
  if (snapshot.sourceUrl !== sourceUrl || snapshot.status !== "live") throw new Error("Incomplete or mismatched Wiki snapshot");
  return snapshot;
}
