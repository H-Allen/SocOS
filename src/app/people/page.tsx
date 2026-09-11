import type { Metadata } from "next";

import { PublicPeoplePage } from "@/components/society/public-people-page";
import { SocietyShell } from "@/components/society/society-shell";
import { publicMediaUrl } from "@/domain/site-banners";
import { listPublicProfiles } from "@/lib/firebase/public-profiles.server";
import { getCurrentEditor } from "@/lib/firebase/editor-auth.server";
import { getSiteBannerSettings } from "@/lib/firebase/site-banners.server";
import { getHypedPageContext } from "@/lib/hyped-site.server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "People · HYPED" };
type PeoplePageProps = { searchParams: Promise<{ member?: string | string[] }> };

export default async function PeoplePage({ searchParams }: PeoplePageProps) {
  const [{ wiki }, query, profiles, bannerSettings, editor] = await Promise.all([
    getHypedPageContext(),
    searchParams,
    listPublicProfiles(),
    getSiteBannerSettings(),
    getCurrentEditor(),
  ]);
  return (
    <SocietyShell editorEmail={editor?.email} wikiNavigation={wiki.navigation}>
      <PublicPeoplePage bannerImageUrl={publicMediaUrl(bannerSettings.banners.people)} bannerPosition={bannerSettings.positions.people} canEdit={Boolean(editor)} initialProfileId={typeof query.member === "string" ? query.member : undefined} profiles={profiles} />
    </SocietyShell>
  );
}
