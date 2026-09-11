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
      bio: "I work on pod software.",
      displayName: "Avery Example",
      expertise: ["C++"],
      id: "avery",
      order: 0,
      photoURL: null,
      responsibilities: ["Telemetry"],
      role: "teamLead",
      roleTitle: "Software Team Lead",
      teamIds: ["Software"],
    });
    expect(view).toMatchObject({
      displayName: "Avery Example",
      id: "avery",
    });
    expect(view).not.toHaveProperty("consentConfirmed");
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
