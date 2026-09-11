import type { Metadata } from "next";

import { OnboardingJourney } from "@/components/society/onboarding-journey";
import { SocietyShell } from "@/components/society/society-shell";
import { publicMediaUrl } from "@/domain/site-banners";
import { getOnboardingGuide } from "@/lib/firebase/onboarding.server";
import { getCurrentEditor } from "@/lib/firebase/editor-auth.server";
import { getSiteBannerSettings } from "@/lib/firebase/site-banners.server";
import { getHypedPageContext } from "@/lib/hyped-site.server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Start here · HYPED" };

export default async function StartPage() {
  const [{ wiki }, guide, bannerSettings, editor] = await Promise.all([getHypedPageContext(), getOnboardingGuide(), getSiteBannerSettings(), getCurrentEditor()]);
  return (
    <SocietyShell editorEmail={editor?.email} wikiNavigation={wiki.navigation}>
      <OnboardingJourney bannerImageUrl={publicMediaUrl(bannerSettings.banners.start)} bannerPosition={bannerSettings.positions.start} canEdit={Boolean(editor)} guide={guide} />
    </SocietyShell>
  );
}
