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
    body: "Embedded software and testing tools for pod telemetry.",
    excerpt: "Software testing and telemetry",
    href: "/wiki?page=Telemetry",
    icon: "👤",
    id: "wiki:telemetry",
    keywords: ["C++", "React", "Telemetry", "Pod telemetry", "owns runs leads"],
    kind: "wiki",
    title: "Telemetry",
  },
  {
    excerpt: "Learn how every team connects to the final pod.",
    href: "/wiki?page=System",
    icon: "→",
    id: "wiki:whole-system",
    keywords: ["first week", "dynamics", "software"],
    kind: "wiki",
    title: "See the whole system",
  },
];

describe("society search", () => {
  it("puts a matching title ahead of a keyword-only match", () => {
    const results = rankSocietySearchDocuments("software", documents);
    expect(results[0]?.id).toBe("wiki:software-handbook");
    expect(results.map((result) => result.id)).toEqual(expect.arrayContaining([
      "wiki:telemetry",
      "wiki:whole-system",
    ]));
  });

  it("finds Wiki pages by keywords", () => {
    expect(rankSocietySearchDocuments("pod telemetry", documents)[0]).toMatchObject({
      href: "/wiki?page=Telemetry",
      title: "Telemetry",
    });
  });

  it("favours the Wiki page with repeated matching context", () => {
    expect(rankSocietySearchDocuments("telemetry", documents)[0]?.id).toBe("wiki:telemetry");
  });

  it("understands a natural question without requiring filler words", () => {
    expect(rankSocietySearchDocuments("who runs telemetry", documents)[0]?.id).toBe("wiki:telemetry");
  });

  it("requires every query word and rejects tiny searches", () => {
    expect(rankSocietySearchDocuments("software braking", documents)).toEqual([]);
    expect(rankSocietySearchDocuments("s", documents)).toEqual([]);
    expect(societySearchQuerySchema.safeParse("  useful search  ").data).toBe("useful search");
  });
});
