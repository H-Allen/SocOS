import { describe, expect, it } from "vitest";

import {
  createDefaultHomepageContent,
  homepageContentSchema,
  homepageSectionSchema,
} from "@/domain/homepage";

describe("homepage content", () => {
  it("ships with small, factual HYPED content", () => {
    const homepage = createDefaultHomepageContent();

    expect(homepageContentSchema.parse(homepage)).toEqual(homepage);
    expect(homepage.title).toBe("HYPED");
    expect(homepage.tagline).toContain("University of Edinburgh");
    expect(homepage.sections).toHaveLength(2);
    expect(homepage.quickLinks).toContainEqual({ label: "Start here", href: "/start" });
    expect(homepage.quickLinks).toContainEqual({ label: "GitHub", href: "https://github.com/Hyp-ed" });
  });

  it("supports only factual text and verified link sections", () => {
    expect(homepageSectionSchema.safeParse({ id: "about", kind: "text", heading: "About", body: "Facts." }).success).toBe(true);
    expect(homepageSectionSchema.safeParse({ id: "events", kind: "events", heading: "Events", events: [] }).success).toBe(false);
  });

  it("accepts internal paths and HTTPS links only", () => {
    const homepage = createDefaultHomepageContent();
    homepage.quickLinks[0].href = "http://unknown.example";
    expect(homepageContentSchema.safeParse(homepage).success).toBe(false);

    homepage.quickLinks[0].href = "/start";
    expect(homepageContentSchema.safeParse(homepage).success).toBe(true);
  });
});
