import type { Metadata } from "next";

import { HomePage } from "@/components/society/home-page";
import { SocietyShell } from "@/components/society/society-shell";
import { createDefaultHomepageContent } from "@/domain/homepage";
import { getPublishedHomepage } from "@/lib/firebase/homepages.server";
import { getCurrentEditor } from "@/lib/firebase/editor-auth.server";
import { getSiteBannerSettings } from "@/lib/firebase/site-banners.server";
import { getHypedPageContext } from "@/lib/hyped-site.server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  description: "The home of HYPED at the University of Edinburgh.",
  title: "HYPED",
};

export default async function HypedHomePage() {
  const [{ wiki }, published, bannerSettings, editor] = await Promise.all([
    getHypedPageContext(),
    getPublishedHomepage().catch(() => null),
    getSiteBannerSettings(),
    getCurrentEditor(),
  ]);
  const content = published ?? createDefaultHomepageContent();

  return (
    <SocietyShell editorEmail={editor?.email} wikiNavigation={wiki.navigation}>
      <HomePage bannerImagePath={bannerSettings.banners.home} bannerPosition={bannerSettings.positions.home} canEdit={Boolean(editor)} content={content} />
    </SocietyShell>
  );
}
