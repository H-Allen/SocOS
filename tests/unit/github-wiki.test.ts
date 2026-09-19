import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { indexPageIds, splitWikiPages } from "@/domain/wiki-navigation";

import {
  applyGithubWikiSidebar,
  buildGithubWikiTree,
  getGithubWikiSnapshot,
  mapSettledWithConcurrency,
  parseGithubWikiIndex,
  parseGithubWikiPage,
  parseGithubWikiSidebar,
  type GithubWikiPage,
} from "@/lib/github-wiki.server";

const repository = vi.hoisted(() => ({ paths: [] as string[], available: true }));
vi.mock("@/lib/wiki-repository.server", () => ({ getWikiRepositoryPaths: async () => repository }));

describe("GitHub Wiki adapter", () => {
  beforeEach(() => { repository.paths = []; repository.available = true; });
  afterEach(() => vi.unstubAllGlobals());

  it("bounds upstream concurrency and preserves result ordering through failures", async () => {
    let active = 0;
    let peak = 0;
    const results = await mapSettledWithConcurrency(Array.from({ length: 32 }, (_, i) => i), 4, async i => {
      active++;
      peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 1));
      active--;
      if (i === 7) throw new Error("upstream failure");
      return i;
    });
    expect(peak).toBe(4);
    expect(results[7].status).toBe("rejected");
    expect(results[31]).toEqual({ status: "fulfilled", value: 31 });
  });

  it("discovers Wiki pages and keeps Home first", () => {
    const pages = parseGithubWikiIndex(`
      <div class="Box-row">
        <a href="/Hyp-ed/hyped-2025/wiki/boards_overview">Boards overview</a>
        <relative-time datetime="2026-08-24T18:30:00Z"></relative-time>
      </div>
      <div class="Box-row"><a href="/Hyp-ed/hyped-2025/wiki/Home">Home</a></div>
      <a href="/Hyp-ed/hyped-2025/wiki/_history">History</a>
      <a href="https://example.com">Elsewhere</a>
    `);

    expect(pages).toEqual([
      { id: "Home", title: "Home", updatedAt: null },
      { id: "boards_overview", title: "Boards overview", updatedAt: "2026-08-24T18:30:00Z" },
    ]);
  });

  it("sanitises rendered HTML and rewrites internal Wiki links", () => {
    const page = parseGithubWikiPage(`
      <article class="markdown-body">
        <h1>Boards Overview</h1>
        <p onclick="alert('no')" style="color:red">An overview of every board.</p>
        <h2>High power</h2>
        <a href="wiki/high_power_board">Read it</a>
        <a href="https://example.com/reference">Reference</a>
        <script>alert('no')</script>
      </article>
    `, { id: "boards_overview", title: "Boards", updatedAt: null });

    expect(page.title).toBe("Boards");
    expect(page.navigationTitle).toBe("Boards");
    expect(page.summary).toBe("An overview of every board.");
    expect(page.outgoingIds).toEqual(["high_power_board"]);
    expect(page.headings).toEqual([
      { id: "boards-overview", level: 1, title: "Boards Overview" },
      { id: "high-power", level: 2, title: "High power" },
    ]);
    expect(page.html).toContain("<h1");
    expect(page.html).toContain("Boards Overview</h1>");
    expect(page.html).toContain('href="/wiki?page=high_power_board"');
    expect(page.html).toContain('target="_blank"');
    expect(page.html).not.toContain("onclick");
    expect(page.html).not.toContain("style=");
    expect(page.html).not.toContain("<script");
  });

  it("does not invent source content for an index made only from links", () => {
    const page = parseGithubWikiPage(`
      <article class="markdown-body">
        <h1>Documentations</h1>
        <p><a href="wiki/boards_overview">Boards</a></p>
      </article>
    `, { id: "general_overview", title: "general_overview", updatedAt: null });

    expect(page.title).toBe("general_overview");
    expect(page.navigationTitle).toBe("General Overview");
    expect(page.summary).toBe("");
    expect(page.html).toContain("Documentations</h1>");
  });

  it("preserves links to archived Wikis and section fragments", () => {
    const page = parseGithubWikiPage(`<article class="markdown-body">
      <a href="https://github.com/Hyp-ed/hyped-2024/wiki/Home">2024 archive</a>
      <a href="wiki/Setup#installation">Setup</a>
      <a href="#local-section">This section</a>
    </article>`, { id: "Home", title: "Home", updatedAt: null });
    expect(page.html).toContain('href="https://github.com/Hyp-ed/hyped-2024/wiki/Home"');
    expect(page.html).toContain('href="/wiki?page=Setup#installation"');
    expect(page.html).toContain('href="#local-section"');
    expect(page.outgoingIds).toEqual(["Setup"]);
  });

  it("renders inline and display LaTeX while leaving code examples unchanged", () => {
    const page = parseGithubWikiPage(`
      <article class="markdown-body">
        <h1>Motor control</h1>
        <p>The wave is $\\sin(\\omega t + \\phi)$.</p>
        <p>$$\\omega = 2\\pi f$$</p>
        <p>And this form works too: \\(a^2 + b^2 = c^2\\).</p>
        <pre><code>$not_math$</code></pre>
      </article>
    `, { id: "motor-control", title: "Motor control", updatedAt: null });

    expect(page.html).toContain('class="katex"');
    expect(page.html).toContain('class="katex-display"');
    expect(page.html).toContain("annotation encoding=\"application/x-tex\">\\sin(\\omega t + \\phi)</annotation>");
    expect(page.html).toContain("annotation encoding=\"application/x-tex\">a^2 + b^2 = c^2</annotation>");
    expect(page.html).toContain("<code>$not_math$</code>");
  });

  it("does not mistake escaped dollar signs or ordinary currency for LaTeX", () => {
    const page = parseGithubWikiPage(`
      <article class="markdown-body">
        <h1>Costs</h1>
        <p>A part costs $5 and another costs $10. Write \\$x$ literally.</p>
      </article>
    `, { id: "costs", title: "Costs", updatedAt: null });

    expect(page.html).not.toContain('class="katex"');
    expect(page.html).toContain("$5 and another costs $10");
    expect(page.html).toContain("\\$x$ literally");
  });

  it("renders GitHub alert markers as accessible callouts", () => {
    const page = parseGithubWikiPage(`
      <article class="markdown-body">
        <h1>Setup</h1>
        <blockquote><p>[!Warning]<br>Resetting will remove the configuration.</p></blockquote>
        <blockquote><p>[!INFO]</p><p>The adapter uses a static address.</p></blockquote>
      </article>
    `, { id: "setup", title: "Setup", updatedAt: null });

    expect(page.html).toContain('data-wiki-alert="warning"');
    expect(page.html).toContain('aria-label="Warning"');
    expect(page.html).toContain('data-wiki-alert-title="true">Warning</p>');
    expect(page.html).toContain("Resetting will remove the configuration.");
    expect(page.html).not.toContain("[!Warning]");
    expect(page.html).toContain('data-wiki-alert="info"');
    expect(page.html).not.toContain("[!INFO]");
  });

  it("normalises alerts already rendered by GitHub", () => {
    const page = parseGithubWikiPage(`
      <article class="markdown-body">
        <h1>Review</h1>
        <blockquote class="markdown-alert markdown-alert-important">
          <p class="markdown-alert-title"><svg><path d="M0 0"></path></svg>Important</p>
          <p>Keep this documentation current.</p>
        </blockquote>
      </article>
    `, { id: "review", title: "Review", updatedAt: null });

    expect(page.html).toContain('class="githubWikiAlert githubWikiAlert-important"');
    expect(page.html).toContain('data-wiki-alert="important"');
    expect(page.html).toContain('role="note"');
    expect(page.html).toContain('data-wiki-alert-title="true">Important</p>');
    expect(page.html).not.toContain("<svg");
  });

  it("turns the links between pages into a stable navigation tree", () => {
    const home = wikiPage("Home", ["boards_overview", "sensors_overview"]);
    const boards = wikiPage("boards_overview", ["high_power_board"]);
    const sensors = wikiPage("sensors_overview", []);
    const board = wikiPage("high_power_board", []);
    const orphan = wikiPage("unlinked_notes", []);

    const tree = buildGithubWikiTree([board, orphan, sensors, home, boards]);
    expect(tree.map((page) => page.id)).toEqual([
      "Home",
      "boards_overview",
      "high_power_board",
      "sensors_overview",
      "unlinked_notes",
    ]);
    expect(tree.find((page) => page.id === "boards_overview")?.parentId).toBe("Home");
    expect(tree.find((page) => page.id === "high_power_board")?.parentId).toBe("boards_overview");
    expect(tree.find((page) => page.id === "unlinked_notes")?.parentId).toBeNull();
  });

  it("uses _Sidebar.md labels, directories, nesting and order for navigation", () => {
    const sidebar = parseGithubWikiSidebar(`
* [Home](https://github.com/Hyp-ed/hyped-2026/wiki)
* Technical Guides
  * \`git\`
    * [Using \`git\` and GitHub](https://github.com/Hyp-ed/hyped-2026/wiki/Using-git-and-GitHub)
  * Rust
    * [Embassy](https://github.com/Hyp-ed/hyped-2026/wiki/Embassy)
* [Glossary](https://github.com/Hyp-ed/hyped-2026/wiki/Glossary)
    `);

    expect(sidebar.map(({ kind, pageId, title }) => ({ kind, pageId, title }))).toEqual([
      { kind: "page", pageId: "Home", title: "Home" },
      { kind: "directory", pageId: null, title: "Technical Guides" },
      { kind: "directory", pageId: null, title: "git" },
      { kind: "page", pageId: "Using-git-and-GitHub", title: "Using git and GitHub" },
      { kind: "directory", pageId: null, title: "Rust" },
      { kind: "page", pageId: "Embassy", title: "Embassy" },
      { kind: "page", pageId: "Glossary", title: "Glossary" },
    ]);
    expect(sidebar[2]?.parentId).toBe(sidebar[1]?.id);
    expect(sidebar[3]?.parentId).toBe(sidebar[2]?.id);

    const { navigation, pages } = applyGithubWikiSidebar([
      wikiPage("Glossary", []),
      wikiPage("Embassy", []),
      wikiPage("Home", []),
      wikiPage("Using-git-and-GitHub", []),
      wikiPage("Hidden-Draft", []),
    ], sidebar);

    expect(navigation.filter((item) => item.kind === "page").map((item) => item.pageId)).toEqual([
      "Home",
      "Using-git-and-GitHub",
      "Embassy",
      "Glossary",
    ]);
    expect(pages.map((page) => page.id)).toEqual([
      "Home",
      "Using-git-and-GitHub",
      "Embassy",
      "Glossary",
      "Hidden-Draft",
    ]);
    expect(pages.find((page) => page.id === "Using-git-and-GitHub")?.navigationTitle).toBe("Using git and GitHub");
  });

  it("keeps the site usable when GitHub is temporarily unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const snapshot = await getGithubWikiSnapshot();
    expect(snapshot.status).toBe("unavailable");
    expect(snapshot.pages).toHaveLength(1);
    expect(snapshot.pages[0]).toMatchObject({ id: "Home", title: "Home" });
    expect(snapshot.pages[0]?.html).toContain("could not be loaded from GitHub");
    expect(snapshot.indexNavigation).toEqual([]);
  });

  it("only promotes Markdown files in the root index directory", () => {
    expect(indexPageIds([
      "Home.md", "index/People.md", "index/Getting Started.markdown",
      "index/resources/Contacts.md", "index/_Sidebar.md", "index/.draft.md",
      "index/logo.png", "index.md", "boards/index/Other.md", "Index/Case.md",
    ])).toEqual(["People", "Getting-Started", "Contacts"]);
    expect(indexPageIds(["index/.gitkeep"])).toEqual([]);
  });

  it("does not guess between duplicate Wiki filenames", () => {
    expect(indexPageIds(["Home.md", "index/Home.md", "index/People.md", "teams/people.markdown"])).toEqual([]);
  });

  it("separates index pages and prunes empty Wiki directories without hiding other pages", () => {
    const pages = ["Home", "People", "Onboarding", "Board"].map((id) => wikiPage(id, []));
    const sidebar = parseGithubWikiSidebar("* Main\n  * [People](index/People.md)\n  * [Welcome](Home)\n* Technical\n  * [Board](Board)");
    const labelled = applyGithubWikiSidebar(pages, sidebar).pages;
    const split = splitWikiPages(labelled, sidebar, ["index/Home.md", "index/People.md", "index/Onboarding.md", "boards/Board.md"]);
    expect(split.indexNavigation.map((item) => [item.pageId, item.title])).toEqual([
      ["Home", "Welcome"], ["People", "People"], ["Onboarding", "Onboarding"],
    ]);
    const technical = applyGithubWikiSidebar(split.wikiPages, sidebar).navigation;
    expect(technical.map((item) => item.title)).toEqual(["Technical", "Board"]);
    expect(split.indexNavigation.every((item) => item.parentId === null)).toBe(true);
  });

  it("keeps the Wiki unchanged when the index directory is absent or empty", () => {
    const pages = [wikiPage("Home", []), wikiPage("People", [])];
    for (const paths of [[], ["Home.md", "People.md"], ["index/.gitkeep"]]) {
      expect(splitWikiPages(pages, [], paths)).toEqual({ indexNavigation: [], wikiPages: pages });
    }
  });

  it("renders promoted pages even when the GitHub page list and sidebar omit them", async () => {
    repository.paths = ["Home.md", "index/People.md"];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.endsWith("/_pages")) return new Response('<a href="/Hyp-ed/hyped-2027/wiki/Home">Home</a>');
      if (url.endsWith("/_Sidebar.md")) return new Response("* [Home](Home)");
      return new Response('<article class="markdown-body"><p>Published content</p></article>');
    }));
    const snapshot = await getGithubWikiSnapshot();
    expect(snapshot.status).toBe("live");
    expect(snapshot.indexNavigation.map((item) => item.pageId)).toEqual(["People"]);
    expect(snapshot.navigation.map((item) => item.pageId)).toEqual(["Home"]);
    expect(snapshot.pages.find((page) => page.id === "People")?.html).toContain("Published content");
  });

  it("handles folder removal on the next snapshot and keeps page links valid", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.endsWith("/_pages")) return new Response('<a href="/Hyp-ed/hyped-2027/wiki/Home">Home</a><a href="/Hyp-ed/hyped-2027/wiki/People">People</a>');
      if (url.endsWith("/_Sidebar.md")) return new Response("* [Home](Home)\n* [People](People)");
      return new Response('<article class="markdown-body"><p>Content</p></article>');
    }));
    repository.paths = ["Home.md", "index/People.md"];
    expect((await getGithubWikiSnapshot()).indexNavigation).toHaveLength(1);
    repository.paths = ["Home.md", "People.md"];
    const snapshot = await getGithubWikiSnapshot();
    expect(snapshot.indexNavigation).toEqual([]);
    expect(snapshot.navigation.map((item) => item.pageId)).toEqual(["Home", "People"]);
  });
});

function wikiPage(id: string, outgoingIds: string[]): GithubWikiPage {
  return {
    childrenIds: [],
    githubUrl: `https://github.com/Hyp-ed/hyped-2026/wiki/${id}`,
    headings: [],
    html: "",
    icon: "·",
    id,
    navigationTitle: id.replace(/_/g, " "),
    outgoingIds,
    parentId: null,
    summary: id,
    text: id,
    title: id,
    updatedAt: null,
  };
}
