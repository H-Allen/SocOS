import { NextResponse } from "next/server";

import { HYPED_SOCIETY_ID, HYPED_SOCIETY_NAME } from "@/domain/hyped";
import { rankSocietySearchDocuments, societySearchQuerySchema, type SocietySearchDocument } from "@/domain/search";
import { getOnboardingGuide } from "@/lib/firebase/onboarding.server";
import { listPublicProfiles } from "@/lib/firebase/public-profiles.server";
import { listTeams } from "@/lib/firebase/teams.server";
import { getGithubWikiSnapshot } from "@/lib/github-wiki.server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const query = societySearchQuerySchema.safeParse(new URL(request.url).searchParams.get("q") ?? "");
  if (!query.success) return NextResponse.json({ error: "Enter at least two characters" }, { status: 400 });
  const [wiki, onboarding, teams, profiles] = await Promise.all([
    getGithubWikiSnapshot(),
    getOnboardingGuide(HYPED_SOCIETY_ID, HYPED_SOCIETY_NAME).catch(() => null),
    listTeams(HYPED_SOCIETY_ID, HYPED_SOCIETY_NAME).catch(() => []),
    listPublicProfiles(HYPED_SOCIETY_ID),
  ]);
  const documents: SocietySearchDocument[] = [
    ...wiki.pages.map((page) => ({ body: page.text, excerpt: page.summary, href: `/wiki?page=${encodeURIComponent(page.id)}`, icon: page.icon, id: `wiki:${page.id}`, keywords: page.outgoingIds, kind: "wiki" as const, title: page.navigationTitle })),
    ...profiles.map((person) => ({ body: person.bio, excerpt: [person.roleTitle, ...person.teamIds].join(" · "), href: `/people?member=${encodeURIComponent(person.id)}`, icon: "👤", id: `people:${person.id}`, keywords: [...person.teamIds, ...person.expertise, ...person.responsibilities], kind: "people" as const, title: person.displayName })),
    ...(onboarding?.steps ?? []).map((step) => ({ body: `${step.why} ${onboarding?.introduction ?? ""}`, excerpt: step.summary, href: `/start#${encodeURIComponent(step.id)}`, icon: "→", id: `onboarding:${step.id}`, keywords: [step.phase, step.destination.label], kind: "onboarding" as const, title: step.title })),
    ...teams.map((team) => ({ body: `${team.purpose} ${team.owns.join(" ")}`, excerpt: team.summary, href: `/teams?team=${encodeURIComponent(team.id)}`, icon: team.icon, id: `teams:${team.id}`, keywords: [team.currentFocus, ...team.owns], kind: "teams" as const, title: team.name })),
  ];
  return NextResponse.json({ results: rankSocietySearchDocuments(query.data, documents) }, { headers: { "Cache-Control": "public, max-age=30" } });
}
