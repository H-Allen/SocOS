import { describe, expect, it } from "vitest";

import { publicProfileContentSchema, publicProfileViewSchema } from "@/domain/public-profiles";

describe("public profiles", () => {
  it("validates public-safe profile content", () => {
    expect(publicProfileContentSchema.parse(content())).toMatchObject({
      displayName: "Avery Example",
      roleTitle: "Software Team Lead",
    });
    expect(publicProfileContentSchema.safeParse({ ...content(), photoURL: "not-a-url" }).success).toBe(false);
  });

  it("validates the public profile shape used by the directory", () => {
    const view = publicProfileViewSchema.parse({
      ...content(),
      hasUnpublishedChanges: false,
      id: "avery",
      publishedAt: null,
      publishedRevision: 1,
      revision: 1,
      updatedAt: null,
      visibility: "published",
    });
    expect(view).toMatchObject({
      displayName: "Avery Example",
      visibility: "published",
      id: "avery",
    });
  });
});

function content() {
  return {
    bio: "I work on pod software.",
    consentConfirmed: true,
    displayName: "Avery Example",
    expertise: ["C++"],
    order: 0,
    photoURL: null,
    responsibilities: ["Telemetry"],
    role: "teamLead" as const,
    roleTitle: "Software Team Lead",
    teamIds: ["Software"],
  };
}
