import { z } from "zod";

const idSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);
const hexColourSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const mediaPathSchema = z.string().max(500).refine(
  (value) => /^demo:[a-z0-9-]+$/.test(value)
    || /^societies\/[a-z0-9-]+\/public\/homepage\/[a-zA-Z0-9._-]+$/.test(value),
  "Images must use a SocOS media path",
);
const internalOrHttpsUrlSchema = z.string().max(500).refine(
  (value) => value.startsWith("/") || value.startsWith("https://"),
  "Links must be an internal path or an HTTPS URL",
);

export const homepageLinkSchema = z.object({
  label: z.string().trim().min(1).max(40),
  href: internalOrHttpsUrlSchema,
});

const textBlockSchema = z.object({
  id: idSchema,
  kind: z.literal("text"),
  heading: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2_000),
});

const announcementBlockSchema = z.object({
  id: idSchema,
  kind: z.literal("announcement"),
  label: z.string().trim().min(1).max(60),
  heading: z.string().trim().min(1).max(140),
  body: z.string().trim().min(1).max(1_000),
  action: homepageLinkSchema.nullable(),
});

const eventBlockSchema = z.object({
  id: idSchema,
  kind: z.literal("events"),
  heading: z.string().trim().min(1).max(80),
  events: z.array(z.object({
    id: idSchema,
    day: z.string().trim().min(1).max(2),
    month: z.string().trim().min(3).max(3),
    title: z.string().trim().min(1).max(100),
    detail: z.string().trim().min(1).max(140),
  })).min(1).max(8),
});

const calloutBlockSchema = z.object({
  id: idSchema,
  kind: z.literal("callout"),
  label: z.string().trim().min(1).max(60),
  heading: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(500),
  action: homepageLinkSchema,
});

const galleryBlockSchema = z.object({
  id: idSchema,
  kind: z.literal("gallery"),
  label: z.string().trim().max(60),
  heading: z.string().trim().min(1).max(100),
  action: homepageLinkSchema.nullable().default(null),
  items: z.array(z.object({
    id: idSchema,
    title: z.string().trim().min(1).max(120),
    detail: z.string().trim().min(1).max(100),
    imagePath: mediaPathSchema.nullable(),
    placeholder: z.enum(["workshop", "track", "team"]),
  })).min(1).max(8),
});

const linksBlockSchema = z.object({
  id: idSchema,
  kind: z.literal("links"),
  label: z.string().trim().max(60),
  heading: z.string().trim().min(1).max(100),
  links: z.array(homepageLinkSchema.extend({
    id: idSchema,
  })).min(1).max(8),
});

const peopleBlockSchema = z.object({
  id: idSchema,
  kind: z.literal("people"),
  label: z.string().trim().max(60),
  heading: z.string().trim().min(1).max(100),
  people: z.array(z.object({
    id: idSchema,
    name: z.string().trim().min(1).max(80),
    role: z.string().trim().min(1).max(100),
    team: z.string().trim().min(1).max(80),
    initials: z.string().trim().min(1).max(4),
    href: internalOrHttpsUrlSchema.nullable(),
  })).min(1).max(6),
});

export const homepageBlockSchema = z.discriminatedUnion("kind", [
  textBlockSchema,
  announcementBlockSchema,
  eventBlockSchema,
  calloutBlockSchema,
  galleryBlockSchema,
  linksBlockSchema,
  peopleBlockSchema,
]);

export const homepageSectionSchema = z.object({
  id: idSchema,
  layout: z.enum(["single", "split"]),
  blocks: z.array(homepageBlockSchema).min(1).max(2),
}).superRefine((section, context) => {
  const expected = section.layout === "split" ? 2 : 1;
  if (section.blocks.length !== expected) {
    context.addIssue({
      code: "custom",
      message: `${section.layout} sections require ${expected} block${expected === 1 ? "" : "s"}`,
      path: ["blocks"],
    });
  }
});

export const homepageContentSchema = z.object({
  title: z.string().trim().min(2).max(100),
  tagline: z.string().trim().min(1).max(300),
  icon: z.string().trim().min(1).max(12),
  cover: z.object({
    colour: hexColourSchema,
    imagePath: mediaPathSchema.nullable(),
  }),
  quickLinks: z.array(homepageLinkSchema).max(8),
  sections: z.array(homepageSectionSchema).max(30),
});

export type HomepageBlock = z.infer<typeof homepageBlockSchema>;
export type HomepageContent = z.infer<typeof homepageContentSchema>;
export type HomepageSection = z.infer<typeof homepageSectionSchema>;

type DefaultHomepageOptions = {
  onboardingHref?: string;
  societyName?: string;
  summary?: string;
  wikiHref?: string;
};

type HomepageSectionKind =
  | "text"
  | "announcement"
  | "columns"
  | "gallery"
  | "links"
  | "people";

type HomepageSectionOptions = DefaultHomepageOptions & {
  instanceId?: string;
};

function createHomepageSection(
  kind: HomepageSectionKind,
  options: HomepageSectionOptions = {},
): HomepageSection {
  const societyName = options.societyName ?? "HYPED";
  const wikiHref = options.wikiHref ?? "/wiki";
  const onboardingHref = options.onboardingHref ?? "/start";
  const suffix = options.instanceId ? `-${options.instanceId}` : "";
  const id = (value: string) => `${value}${suffix}`;

  const sections: Record<HomepageSectionKind, HomepageSection> = {
    text: {
      id: id("welcome"),
      layout: "single",
      blocks: [{
        id: id("welcome-text"),
        kind: "text",
        heading: `Welcome to ${societyName}`,
        body: "We design and build a hyperloop pod, then take it to European Hyperloop Week each summer. There are eight teams across engineering, operations and outreach — and plenty to learn even if you have never built anything like this before.",
      }],
    },
    announcement: {
      id: id("design-review"),
      layout: "single",
      blocks: [{
        id: id("design-review-announcement"),
        kind: "announcement",
        label: "Announcement · 2 days ago",
        heading: "All-team design review this Wednesday",
        body: "Come to Appleton Tower 2.14 at 18:00. Each sub-team will share what they have built and what is blocked.",
        action: { label: "Read update", href: wikiHref },
      }],
    },
    columns: {
      id: id("next-up"),
      layout: "split",
      blocks: [
        {
          id: id("upcoming-events"),
          kind: "events",
          heading: "Coming up",
          events: [
            { id: id("design-review-event"), day: "14", month: "OCT", title: "Design review", detail: "18:00 · Appleton Tower" },
            { id: id("team-social-event"), day: "17", month: "OCT", title: "Team social", detail: "19:30 · The Pear Tree" },
            { id: id("workshop-event"), day: "21", month: "OCT", title: "Workshop induction", detail: "17:00 · Kings Buildings" },
          ],
        },
        {
          id: id("new-member-callout"),
          kind: "callout",
          label: "New around here?",
          heading: "Start with the basics.",
          body: "Meet the team, understand the pod and get set up for your first week.",
          action: { label: "Start here", href: onboardingHref },
        },
      ],
    },
    gallery: {
      id: id("team-gallery"),
      layout: "single",
      blocks: [{
        id: id("latest-gallery"),
        kind: "gallery",
        label: "Latest from the team",
        heading: "What we’ve been up to",
        action: { label: "See all updates", href: wikiHref },
        items: [
          { id: id("chassis-workshop"), title: "First chassis workshop of the year", detail: "Mechanical · 6 photos", imagePath: null, placeholder: "workshop" },
          { id: id("levitation-rig"), title: "Testing the levitation rig", detail: "Dynamics · Friday", imagePath: null, placeholder: "track" },
          { id: id("new-team"), title: "Say hello to this year’s team", detail: "Society · September", imagePath: null, placeholder: "team" },
        ],
      }],
    },
    links: {
      id: id("useful-links"),
      layout: "single",
      blocks: [{
        id: id("useful-links-block"),
        kind: "links",
        label: "The useful stuff",
        heading: "Find what you need",
        links: [
          { id: id("link-discord"), label: "Chat on Discord", href: "https://discord.com" },
          { id: id("link-github"), label: "Browse our GitHub", href: "https://github.com" },
          { id: id("link-guide"), label: "New member guide", href: onboardingHref },
        ],
      }],
    },
    people: {
      id: id("people-spotlight"),
      layout: "single",
      blocks: [{
        id: id("people-spotlight-block"),
        kind: "people",
        label: "People to know",
        heading: "Who can help",
        people: [
          { id: id("person-team-lead"), name: "Alex Morgan", role: "Team Lead", team: "Committee", initials: "AM", href: null },
          { id: id("person-tech-lead"), name: "Sam Reid", role: "Technical Director", team: "Engineering", initials: "SR", href: null },
          { id: id("person-welfare"), name: "Jamie Chen", role: "Welfare Officer", team: "Committee", initials: "JC", href: null },
        ],
      }],
    },
  };

  return homepageSectionSchema.parse(sections[kind]);
}

export function createDefaultHomepageContent(
  options: DefaultHomepageOptions = {},
): HomepageContent {
  const societyName = options.societyName ?? "HYPED";
  const summary = options.summary
    ?? "The best hyperloop team in the uk ;)";
  const wikiHref = options.wikiHref ?? "/wiki";
  const onboardingHref = options.onboardingHref ?? "/start";

  return homepageContentSchema.parse({
    title: societyName,
    tagline: summary,
    icon: "🚄",
    cover: { colour: "#5e3b78", imagePath: null },
    quickLinks: [
      { label: "Discord", href: "https://discord.com" },
      { label: "GitHub", href: "https://github.com" },
      { label: "Drive", href: "https://drive.google.com" },
      { label: "New member guide", href: onboardingHref },
    ],
    sections: [
      createHomepageSection("text", { onboardingHref, societyName, wikiHref }),
      createHomepageSection("announcement", { onboardingHref, societyName, wikiHref }),
      createHomepageSection("columns", { onboardingHref, societyName, wikiHref }),
      createHomepageSection("gallery", { onboardingHref, societyName, wikiHref }),
    ],
  });
}
