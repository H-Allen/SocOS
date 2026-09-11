import { describe, expect, it } from "vitest";

import { teamContentSchema } from "@/domain/teams";

describe("team map", () => {
  it("validates published team content without inventing fallback teams", () => {
    const team = {
      connections: [{ teamId: "electronics", reason: "Defines the telemetry interface." }],
      currentFocus: "Document the current telemetry protocol.",
      icon: "S",
      leadUserId: null,
      name: "Software",
      order: 0,
      owns: ["Pod software", "Telemetry"],
      purpose: "Build and maintain the software used by the pod and test team.",
      summary: "Pod software and telemetry.",
      wikiPageId: "Home",
    };

    expect(teamContentSchema.parse(team)).toEqual(team);
  });
});
