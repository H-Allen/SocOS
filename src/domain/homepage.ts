import { z } from "zod";

import { HYPED_SOCIETY_NAME } from "@/domain/hyped";

const idSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);
const internalOrHttpsUrlSchema = z.string().max(500).refine(
  (value) => value.startsWith("/") || value.startsWith("https://"),
  "Links must be an internal path or an HTTPS URL",
);

export const homepageLinkSchema = z.object({
  id: idSchema,
  label: z.string().trim().min(1).max(40),
  href: internalOrHttpsUrlSchema,
});

const textSectionSchema = z.object({
  id: idSchema,
  kind: z.literal("text"),
  heading: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2_000),
});

const linksSectionSchema = z.object({
  id: idSchema,
  kind: z.literal("links"),
  label: z.string().trim().max(60),
  heading: z.string().trim().min(1).max(100),
  links: z.array(homepageLinkSchema).min(1).max(8),
});

export const homepageSectionSchema = z.discriminatedUnion("kind", [
  textSectionSchema,
  linksSectionSchema,
]);

export const homepageContentSchema = z.object({
  title: z.string().trim().min(2).max(100),
  tagline: z.string().trim().min(1).max(300),
  quickLinks: z.array(homepageLinkSchema.omit({ id: true })).max(8),
  sections: z.array(homepageSectionSchema).max(12),
});

export type HomepageContent = z.infer<typeof homepageContentSchema>;
export type HomepageSection = z.infer<typeof homepageSectionSchema>;

export function createDefaultHomepageContent(): HomepageContent {
  return homepageContentSchema.parse({
    title: HYPED_SOCIETY_NAME,
    tagline: "The University of Edinburgh’s student-led Hyperloop team.",
    quickLinks: [
      { label: "Start here", href: "/start" },
      { label: "Technical Wiki", href: "/wiki" },
      { label: "GitHub", href: "https://github.com/Hyp-ed" },
      { label: "Public website", href: "https://hyp-ed.com" },
    ],
    sections: [
      {
        id: "about",
        kind: "text",
        heading: `About ${HYPED_SOCIETY_NAME}`,
        body: "HYPED develops Hyperloop technology and gives students practical engineering experience. This site provides the team directory, onboarding guide and technical documentation.",
      },
      {
        id: "member-resources",
        kind: "links",
        label: "Member resources",
        heading: "Find the right place",
        links: [
          { id: "resource-start", label: "New member guide", href: "/start" },
          { id: "resource-teams", label: "Teams", href: "/teams" },
          { id: "resource-people", label: "People", href: "/people" },
          { id: "resource-wiki", label: "Technical Wiki", href: "/wiki" },
        ],
      },
    ],
  });
}
