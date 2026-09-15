import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/page-metadata";

import { GithubWikiPage } from "@/components/society/github-wiki-page";
import { SocietyShell } from "@/components/society/society-shell";
import { bannerKey, publicMediaUrl } from "@/domain/site-banners";
import { getSiteBannerSettings } from "@/lib/firebase/site-banners.server";
import { getCurrentEditor } from "@/lib/firebase/editor-auth.server";
import { getHypedPageContext } from "@/lib/hyped-site.server";

export const dynamic = "force-dynamic";
type WikiPageProps = { searchParams: Promise<{ page?: string | string[] }> };

export async function generateMetadata({ searchParams }: WikiPageProps): Promise<Metadata> {
  const [{ wikiPages }, query] = await Promise.all([getHypedPageContext(), searchParams]);
  const id = typeof query.page === "string" ? query.page : "Home";
  const page = wikiPages.find((item) => item.id === id);
  return pageMetadata(page ? (id === "Home" ? "Technical Wiki · HYPED" : `${page.title} · HYPED Wiki`) : "Page not found · HYPED Wiki", page?.summary || "Technical documentation maintained by HYPED on GitHub.");
}

export default async function WikiPage({ searchParams }: WikiPageProps) {
  const [{ wiki, wikiPages }, query, bannerSettings, editor] = await Promise.all([getHypedPageContext(), searchParams, getSiteBannerSettings(), getCurrentEditor()]);
  const requestedPageId = typeof query.page === "string" ? query.page : "Home";
  const activePage = wikiPages.find((page) => page.id === requestedPageId);

  if (!activePage) notFound();

  return (
    <SocietyShell activeWikiPageId={activePage.id} editorEmail={editor?.email} editorPhotoUrl={editor?.photoUrl} indexNavigation={wiki.indexNavigation} wikiNavigation={wiki.navigation}>
      <GithubWikiPage bannerImageUrl={publicMediaUrl(bannerSettings.banners[bannerKey(activePage.id)])} bannerPosition={bannerSettings.positions[bannerKey(activePage.id)]} canEdit={Boolean(editor)} indexNavigation={wiki.indexNavigation} navigation={wiki.navigation} page={activePage} status={wiki.status} />
    </SocietyShell>
  );
}
