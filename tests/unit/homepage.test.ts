import { describe, expect, it } from "vitest";

import {
  createDefaultHomepageContent,
  homepageContentSchema,
  homepageSectionSchema,
} from "@/domain/homepage";

describe("homepage content", () => {
  it("builds HYPED-relative starter content", () => {
    const homepage = createDefaultHomepageContent({
      societyName: "Robotics Society",
      summary: "We build small robots together.",
      onboardingHref: "/start",
      wikiHref: "/wiki",
    });

    expect(homepage.title).toBe("Robotics Society");
    expect(homepage.tagline).toBe("We build small robots together.");
    expect(homepage.quickLinks.at(-1)?.href).toBe("/start");
  });

  it("ships with a valid Workshop homepage", () => {
    const homepage = createDefaultHomepageContent();
    expect(homepageContentSchema.parse(homepage)).toEqual(homepage);
    expect(homepage.sections).toHaveLength(4);
  });

  it("opens older gallery drafts that do not have a button yet", () => {
    const legacy = JSON.parse(JSON.stringify(createDefaultHomepageContent())) as Record<string, unknown>;
    const sections = legacy.sections as Array<{ blocks: Array<Record<string, unknown>> }>;
    delete sections[3].blocks[0].action;

    const parsed = homepageContentSchema.parse(legacy);
    const gallery = parsed.sections[3].blocks[0];
    expect(gallery.kind).toBe("gallery");
    if (gallery.kind === "gallery") expect(gallery.action).toBeNull();
  });

  it("accepts only internal or HTTPS links", () => {
    const homepage = createDefaultHomepageContent();
    homepage.quickLinks[0].href = "javascript:alert(1)";
    expect(homepageContentSchema.safeParse(homepage).success).toBe(false);
  });

  it("keeps split sections to exactly two blocks", () => {
    const section = createDefaultHomepageContent().sections[2];
    expect(homepageSectionSchema.parse(section)).toEqual(section);
    expect(
      homepageSectionSchema.safeParse({ ...section, blocks: [section.blocks[0]] })
        .success,
    ).toBe(false);
  });

  it("accepts only managed society image paths", () => {
    const homepage = createDefaultHomepageContent();
    homepage.cover.imagePath = "https://unknown.example/tracking.png";
    expect(homepageContentSchema.safeParse(homepage).success).toBe(false);

    homepage.cover.imagePath = "societies/hyped/public/homepage/cover-1.png";
    expect(homepageContentSchema.safeParse(homepage).success).toBe(true);
  });
});
