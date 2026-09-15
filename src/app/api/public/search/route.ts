import { NextResponse } from "next/server";

import { rankSocietySearchDocuments, societySearchQuerySchema, type SocietySearchDocument } from "@/domain/search";
import { getGithubWikiSnapshot } from "@/lib/github-wiki.server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const query = societySearchQuerySchema.safeParse(new URL(request.url).searchParams.get("q") ?? "");
  if (!query.success) return NextResponse.json({ error: "Enter at least two characters" }, { status: 400 });
  const wiki = await getGithubWikiSnapshot();
  const documents: SocietySearchDocument[] = [
    ...wiki.pages.map((page) => ({ body: page.text, excerpt: page.summary, href: `/wiki?page=${encodeURIComponent(page.id)}`, icon: page.icon, id: `wiki:${page.id}`, keywords: page.outgoingIds, kind: "wiki" as const, title: page.navigationTitle })),
  ];
  return NextResponse.json({ results: rankSocietySearchDocuments(query.data, documents) }, { headers: { "Cache-Control": "public, max-age=30" } });
}
