import { describe, expect, it } from "vitest";

import {
  rankSocietySearchDocuments,
  societySearchQuerySchema,
  type SocietySearchDocument,
} from "@/domain/search";

const documents: SocietySearchDocument[] = [
  {
    body: "Embedded software records live pod data during every test.",
    excerpt: "Setup and handover knowledge for the software team.",
    href: "/wiki?page=telemetry_board",
    icon: "💻",
    id: "wiki:software-handbook",
    keywords: ["C++", "telemetry"],
    kind: "wiki",
    title: "Software handbook",
  },
  {
    body: "I work across embedded software and testing tools.",
    excerpt: "Wiki editor · Software",
    href: "/people?member=sam",
    icon: "👤",
    id: "people:sam",
    keywords: ["C++", "React", "Telemetry", "Pod telemetry", "owns runs leads"],
    kind: "people",
    title: "Sam Walker",
  },
  {
    excerpt: "Learn how every team connects to the final pod.",
    href: "/start#see-the-whole-system",
    icon: "→",
    id: "onboarding:whole-system",
    keywords: ["first week", "dynamics", "software"],
    kind: "onboarding",
    title: "See the whole system",
  },
];

describe("society search", () => {
  it("puts a matching title ahead of a keyword-only match", () => {
    const results = rankSocietySearchDocuments("software", documents);
    expect(results[0]?.id).toBe("wiki:software-handbook");
    expect(results.map((result) => result.id)).toEqual(expect.arrayContaining([
      "people:sam",
      "onboarding:whole-system",
    ]));
  });

  it("finds people by skills and responsibilities", () => {
    expect(rankSocietySearchDocuments("pod telemetry", documents)[0]).toMatchObject({
      href: "/people?member=sam",
      title: "Sam Walker",
    });
  });

  it("favours the person with repeated ownership context", () => {
    expect(rankSocietySearchDocuments("telemetry", documents)[0]?.id).toBe("people:sam");
  });

  it("understands a natural question without requiring filler words", () => {
    expect(rankSocietySearchDocuments("who runs telemetry", documents)[0]?.id).toBe("people:sam");
  });

  it("requires every query word and rejects tiny searches", () => {
    expect(rankSocietySearchDocuments("software braking", documents)).toEqual([]);
    expect(rankSocietySearchDocuments("s", documents)).toEqual([]);
    expect(societySearchQuerySchema.safeParse("  useful search  ").data).toBe("useful search");
  });
});
