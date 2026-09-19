import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { SocietyShell } from "@/components/society/society-shell";
import { GithubWikiPage } from "@/components/society/github-wiki-page";
import { SocietyDocumentCover } from "@/components/society/society-document";
import type { GithubWikiNavigationItem, GithubWikiPage as PageData } from "@/lib/github-wiki.server";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("../../public/default-banner.webp", () => ({ default: { src: "/_next/static/media/default-banner.test.webp" } }));

function entry(id: string): GithubWikiNavigationItem {
  return { id: `page:${id}`, pageId: id, title: id, kind: "page", parentId: null, icon: "·" };
}
const mainPages = ["Home", "People", "Onboarding"].map(entry);
const technicalPages = ["Boards", "Sensors"].map(entry);
const page: PageData = {
  id: "People", title: "People", navigationTitle: "People", html: "<p>Wiki-maintained team contacts.</p>",
  text: "Wiki-maintained team contacts.", summary: "Team contacts.", icon: "·",
  githubUrl: "https://github.com/Hyp-ed/hyped-2027/wiki/People",
  updatedAt: null, headings: [], childrenIds: [], outgoingIds: [], parentId: null,
};

describe("two-section Wiki presentation", () => {
  it("renders main page links above Wiki without duplicating them", () => {
    const $ = load(renderToStaticMarkup(
      <SocietyShell activeWikiPageId="People" indexNavigation={mainPages} wikiNavigation={technicalPages}><p>Content</p></SocietyShell>,
    ));
    expect($('aside nav').map((_, el) => $(el).attr("aria-label")).get()).toEqual(["Main pages", "Wiki"]);
    expect($('nav[aria-label="Main pages"] a').map((_, el) => $(el).text()).get()).toEqual(["Home", "People", "Onboarding"]);
    expect($('nav[aria-label="Main pages"] a[aria-current="page"]').text()).toBe("People");
    expect($('nav[aria-label="Wiki"]').text()).not.toContain("People");
  });

  it("renders no main-pages container when the folder is absent", () => {
    const $ = load(renderToStaticMarkup(
      <SocietyShell wikiNavigation={technicalPages}><p>Content</p></SocietyShell>,
    ));
    expect($('nav[aria-label="Main pages"]')).toHaveLength(0);
    expect($('nav[aria-label="Wiki"]')).toHaveLength(1);
  });

  it("renders an index page's Wiki content and gives mobile navigation distinct groups", () => {
    const $ = load(renderToStaticMarkup(
      <GithubWikiPage indexNavigation={mainPages} navigation={technicalPages} page={page} status="live" />,
    ));
    expect($("h1").text()).toBe("People");
    expect($("article").text()).toContain("Wiki-maintained team contacts.");
    expect($('select[aria-label="Choose a page"] optgroup').map((_, el) => $(el).attr("label")).get()).toEqual(["Main pages", "Wiki"]);
    expect($("option[selected]").attr("value")).toBe("People");
    expect($('[data-has-image="false"]')).toHaveLength(1);
  });

  it("shows decorative default artwork and a square page symbol without banner labels", () => {
    const $ = load(renderToStaticMarkup(
      <GithubWikiPage indexNavigation={[]} navigation={technicalPages} page={page} status="live" />,
    ));
    expect($('[data-has-image="false"]').attr('style')).toContain('url(/_next/static/media/default-banner.test.webp)');
    expect($('[data-has-image="false"]').attr('style')).toContain('background-position:center bottom');
    expect($('header h1').prev('[aria-hidden="true"]').find('svg')).toHaveLength(1);
    expect($('header').text()).not.toMatch(/HYPED \/ TECHNICAL WIKI|Live from GitHub|Source GitHub Wiki/);
  });

  it("layers custom banners over the fallback and preserves their crop", () => {
    const $ = load(renderToStaticMarkup(
      <SocietyDocumentCover imageUrl="https://example.com/team.jpg" positionY={72} />,
    ));
    expect($('[data-has-image="true"]').attr('style')).toContain('background-position:center 72%');
    expect($('[data-has-image="true"]').attr('style')).toContain('https://example.com/team.jpg');
    expect($('[data-has-image="true"]').attr('style')).toContain('url(https://example.com/team.jpg), url(/_next/static/media/default-banner.test.webp)');
    expect($('svg')).toHaveLength(0);
  });

  it("pairs plain metadata labels with bold dates and reading times", () => {
    const $ = load(renderToStaticMarkup(
      <GithubWikiPage indexNavigation={[]} navigation={technicalPages} page={{ ...page, updatedAt: "2024-10-18T12:00:00Z" }} status="live" />,
    ));
    expect($('header strong time').text()).toBe('18 Oct 2024');
    expect($('header strong time').attr('datetime')).toBe('2024-10-18T12:00:00Z');
    expect($('header strong').map((_, el) => $(el).text()).get()).toEqual(['18 Oct 2024', '1 min']);
  });

  it("does not invent metadata when the page is unavailable", () => {
    const $ = load(renderToStaticMarkup(
      <GithubWikiPage indexNavigation={[]} navigation={[]} page={page} status="unavailable" />,
    ));
    expect($('header time')).toHaveLength(0);
    expect($('header').text()).not.toContain('Reading time');
  });
});
