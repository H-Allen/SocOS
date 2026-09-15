import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { SocietyShell } from "@/components/society/society-shell";
import { GithubWikiPage } from "@/components/society/github-wiki-page";
import type { GithubWikiNavigationItem, GithubWikiPage as PageData } from "@/lib/github-wiki.server";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

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
});
