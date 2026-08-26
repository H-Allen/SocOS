import type { Metadata } from "next";

import { GithubWikiPage } from "@/components/society/github-wiki-page";
import { SocietyShell } from "@/components/society/society-shell";
import { publicMediaUrl } from "@/domain/site-banners";
import { getSiteBannerSettings } from "@/lib/firebase/site-banners.server";
import { getCurrentEditor } from "@/lib/firebase/editor-auth.server";
import { getHypedPageContext } from "@/lib/hyped-site.server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Wiki · HYPED" };
type WikiPageProps = { searchParams: Promise<{ page?: string | string[] }> };

export default async function WikiPage({ searchParams }: WikiPageProps) {
  const [{ wiki, wikiPages }, query, bannerSettings, editor] = await Promise.all([getHypedPageContext(), searchParams, getSiteBannerSettings(), getCurrentEditor()]);
  const requestedPageId = typeof query.page === "string" ? query.page : "Home";
  const activePage = wikiPages.find((page) => page.id === requestedPageId)
    ?? wikiPages.find((page) => page.id === "Home")
    ?? wikiPages[0];

  if (!activePage) return null;

  return (
    <SocietyShell activeWikiPageId={activePage.id} editorEmail={editor?.email} wikiNavigation={wiki.navigation}>
      <GithubWikiPage bannerImageUrl={publicMediaUrl(bannerSettings.banners.wiki)} bannerPosition={bannerSettings.positions.wiki} canEdit={Boolean(editor)} navigation={wiki.navigation} page={activePage} status={wiki.status} />
    </SocietyShell>
  );
}
