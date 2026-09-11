import type { Metadata } from "next";

import { SocietyShell } from "@/components/society/society-shell";
import { TeamsPage } from "@/components/society/teams-page";
import { publicMediaUrl } from "@/domain/site-banners";
import { listTeams } from "@/lib/firebase/teams.server";
import { getCurrentEditor } from "@/lib/firebase/editor-auth.server";
import { listPublicProfiles } from "@/lib/firebase/public-profiles.server";
import { getSiteBannerSettings } from "@/lib/firebase/site-banners.server";
import { getHypedPageContext } from "@/lib/hyped-site.server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Teams · HYPED" };
type TeamsRouteProps = { searchParams: Promise<{ team?: string | string[] }> };

export default async function TeamsRoute({ searchParams }: TeamsRouteProps) {
  const [{ wiki }, query, teams, profiles, bannerSettings, editor] = await Promise.all([
    getHypedPageContext(),
    searchParams,
    listTeams(),
    listPublicProfiles(),
    getSiteBannerSettings(),
    getCurrentEditor(),
  ]);
  return (
    <SocietyShell editorEmail={editor?.email} wikiNavigation={wiki.navigation}>
      <TeamsPage bannerImageUrl={publicMediaUrl(bannerSettings.banners.teams)} bannerPosition={bannerSettings.positions.teams} canEdit={Boolean(editor)} initialTeamId={typeof query.team === "string" ? query.team : undefined} people={profiles} teams={teams} />
    </SocietyShell>
  );
}
