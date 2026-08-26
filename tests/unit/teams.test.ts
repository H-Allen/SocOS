import { describe, expect, it } from "vitest";

import { createDefaultTeams, teamContentSchema } from "@/domain/teams";

describe("team map", () => {
  it("creates a connected HYPED-wide view rather than isolated departments", () => {
    const teams = createDefaultTeams("HYPED");
    expect(teams).toHaveLength(6);
    expect(teams.every((team) => team.connections.length >= 3)).toBe(true);
    expect(teams.find((team) => team.name === "Software")?.connections.map((item) => item.teamId))
      .toEqual(expect.arrayContaining(["dynamics", "electrical", "systems"]));
  });

  it("links starter teams to pages that can exist in the GitHub Wiki", () => {
    const teams = createDefaultTeams("HYPED");
    expect(teams.every((team) => teamContentSchema.safeParse(team).success)).toBe(true);
    expect(teams.find((team) => team.name === "Systems")?.wikiPageId).toBe("general_overview");
  });
});
