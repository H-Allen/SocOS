import "server-only";

import { load } from "cheerio";
import katex from "katex";
import { indexPageIds, splitWikiPages } from "@/domain/wiki-navigation";
import { getWikiRepositoryPaths } from "@/lib/wiki-repository.server";
import { GITHUB_WIKI_REPOSITORY } from "@/domain/wiki-config";
export { GITHUB_WIKI_REPOSITORY } from "@/domain/wiki-config";

const GITHUB_ORIGIN = "https://github.com";
const GITHUB_WIKI_ROOT = `${GITHUB_ORIGIN}/${GITHUB_WIKI_REPOSITORY}/wiki`;
const GITHUB_WIKI_PAGES = `${GITHUB_WIKI_ROOT}/_pages`;
const GITHUB_WIKI_SIDEBAR = `https://raw.githubusercontent.com/wiki/${GITHUB_WIKI_REPOSITORY}/_Sidebar.md`;

const ignoredSlugs = new Set(["_pages", "_history", "_edit", "_new", "_toc", "_sidebar", "_footer"]);

export type GithubWikiHeading = {
  id: string;
  level: 1 | 2 | 3;
  title: string;
};

export type GithubWikiPage = {
  childrenIds: string[];
  githubUrl: string;
  headings: GithubWikiHeading[];
  html: string;
  icon: string;
  id: string;
  navigationTitle: string;
  outgoingIds: string[];
  parentId: string | null;
  summary: string;
  text: string;
  title: string;
  updatedAt: string | null;
};

export type GithubWikiSnapshot = {
  indexNavigation: GithubWikiNavigationItem[];
  navigation: GithubWikiNavigationItem[];
  pages: GithubWikiPage[];
  sourceUrl: string;
  status: "live" | "partial" | "unavailable";
  syncedAt: string;
};

export type GithubWikiNavigationItem = {
  icon: string;
  id: string;
  kind: "directory" | "page";
  pageId: string | null;
  parentId: string | null;
  title: string;
};

export type WikiIndexPage = {
  id: string;
  title: string;
  updatedAt: string | null;
};

export async function getGithubWikiSnapshot(): Promise<GithubWikiSnapshot> {
  const syncedAt = new Date().toISOString();
  const deadline = AbortSignal.timeout(90_000);

  try {
    const [indexResponse, sidebarResponse, repository] = await Promise.all([
      fetch(GITHUB_WIKI_PAGES, {
        signal: AbortSignal.timeout(10_000),
        headers: githubHeaders(),
        cache: "no-store",
      }),
      fetch(GITHUB_WIKI_SIDEBAR, {
        signal: AbortSignal.timeout(10_000),
        headers: { ...githubHeaders(), Accept: "text/plain" },
        cache: "no-store",
      }),
      getWikiRepositoryPaths(GITHUB_WIKI_REPOSITORY),
    ]);
    if (!indexResponse.ok) throw new Error(`GitHub Wiki index returned ${indexResponse.status}`);

    const indexPages = parseGithubWikiIndex(await indexResponse.text());
    for (const id of indexPageIds(repository.paths)) {
      if (!indexPages.some((page) => page.id.toLowerCase() === id.toLowerCase())) {
        indexPages.push({ id, title: navigationTitleFromSource(id, id), updatedAt: null });
      }
    }
    if (!indexPages.length) throw new Error("GitHub Wiki index did not contain any pages");

    const results = await mapSettledWithConcurrency(indexPages, 4, async (indexPage) => {
      const githubUrl = `${GITHUB_WIKI_ROOT}/${encodeURIComponent(indexPage.id)}`;
      const response = await fetch(githubUrl, {
        signal: AbortSignal.any([deadline, AbortSignal.timeout(10_000)]),
        headers: githubHeaders(),
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`${indexPage.id} returned ${response.status}`);
      return parseGithubWikiPage(await response.text(), indexPage);
    });

    const fetchedPages = results.map((result, index) => (
      result.status === "fulfilled"
        ? result.value
        : unavailablePage(indexPages[index])
    ));
    const sidebarItems = sidebarResponse.ok
      ? parseGithubWikiSidebar(await sidebarResponse.text())
      : [];
    const { pages } = applyGithubWikiSidebar(fetchedPages, sidebarItems);
    const { indexNavigation, wikiPages } = splitWikiPages(pages, sidebarItems, repository.paths);
    const { navigation } = applyGithubWikiSidebar(wikiPages, sidebarItems);
    const sidebarUnavailable = !sidebarResponse.ok || sidebarItems.length === 0;

    return {
      indexNavigation,
      navigation,
      pages,
      sourceUrl: GITHUB_WIKI_ROOT,
      status: !repository.available || sidebarUnavailable || results.some((result) => result.status === "rejected") ? "partial" : "live",
      syncedAt,
    };
  } catch {
    return {
      indexNavigation: [],
      navigation: fallbackNavigation([unavailablePage({ id: "Home", title: "Home", updatedAt: null })]),
      pages: [unavailablePage({ id: "Home", title: "Home", updatedAt: null })],
      sourceUrl: GITHUB_WIKI_ROOT,
      status: "unavailable",
      syncedAt,
    };
  }
}

export async function mapSettledWithConcurrency<T, R>(items: T[], concurrency: number, task: (item: T) => Promise<R>) {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      try { results[index] = { status: "fulfilled", value: await task(items[index]) }; }
      catch (reason) { results[index] = { status: "rejected", reason }; }
    }
  }));
  return results;
}

export function parseGithubWikiSidebar(markdown: string): GithubWikiNavigationItem[] {
  const items: GithubWikiNavigationItem[] = [];
  const ancestors: Array<{ id: string; indent: number }> = [];
  const pageIds = new Set<string>();
  let directoryIndex = 0;

  markdown.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^(\s*)[-*+]\s+(.+?)\s*$/);
    if (!match) return;
    const indent = match[1].replace(/\t/g, "  ").length;
    const content = match[2].trim();
    while (ancestors.length && ancestors.at(-1)!.indent >= indent) ancestors.pop();
    const parentId = ancestors.at(-1)?.id ?? null;
    const link = content.match(/^\[([^\]]+)]\((.+)\)$/);
    const pageId = link ? wikiSlugFromHref(link[2].trim()) : null;

    if (pageId) {
      if (isIgnoredSlug(pageId) || pageIds.has(pageId)) return;
      pageIds.add(pageId);
      const item: GithubWikiNavigationItem = {
        icon: iconForPage(pageId),
        id: `page:${pageId}`,
        kind: "page",
        pageId,
        parentId,
        title: cleanMarkdownLabel(link?.[1] ?? pageId),
      };
      items.push(item);
      ancestors.push({ id: item.id, indent });
      return;
    }

    // External links are not Wiki directories and do not belong in local navigation.
    if (link) return;
    const title = cleanMarkdownLabel(content);
    if (!title) return;
    const item: GithubWikiNavigationItem = {
      icon: "▸",
      id: `directory:${slugifyHeading(title) || "section"}:${directoryIndex++}`,
      kind: "directory",
      pageId: null,
      parentId,
      title,
    };
    items.push(item);
    ancestors.push({ id: item.id, indent });
  });

  return items;
}

export function applyGithubWikiSidebar(
  inputPages: GithubWikiPage[],
  sidebarItems: GithubWikiNavigationItem[],
): { navigation: GithubWikiNavigationItem[]; pages: GithubWikiPage[] } {
  const pagesById = new Map(inputPages.map((page) => [page.id.toLowerCase(), page]));
  const keptIds = new Set<string>();
  const navigation: GithubWikiNavigationItem[] = [];

  sidebarItems.forEach((item) => {
    if (item.kind === "page") {
      const page = item.pageId ? pagesById.get(item.pageId.toLowerCase()) : undefined;
      if (!page) return;
      keptIds.add(item.id);
      navigation.push({ ...item, icon: page.icon, pageId: page.id });
      return;
    }
    navigation.push(item);
  });

  for (let index = navigation.length - 1; index >= 0; index -= 1) {
    const item = navigation[index];
    if (item.kind === "directory" && navigation.some((candidate) => candidate.parentId === item.id && keptIds.has(candidate.id))) {
      keptIds.add(item.id);
    }
  }

  const filteredNavigation = navigation
    .filter((item) => keptIds.has(item.id))
    .map((item) => ({ ...item, parentId: item.parentId && keptIds.has(item.parentId) ? item.parentId : null }));
  if (!filteredNavigation.some((item) => item.kind === "page")) {
    return { navigation: fallbackNavigation(inputPages), pages: buildGithubWikiTree(inputPages) };
  }

  const navigationByPageId = new Map(filteredNavigation.flatMap((item) => item.pageId ? [[item.pageId, item] as const] : []));
  const orderedIds = filteredNavigation.flatMap((item) => item.pageId ? [item.pageId] : []);
  const orderedPages = [
    ...orderedIds.map((id) => inputPages.find((page) => page.id === id)).filter(Boolean),
    ...inputPages.filter((page) => !orderedIds.includes(page.id)),
  ] as GithubWikiPage[];

  return {
    navigation: filteredNavigation,
    pages: orderedPages.map((page) => {
      const navigationItem = navigationByPageId.get(page.id);
      return navigationItem ? { ...page, navigationTitle: navigationItem.title } : page;
    }),
  };
}

export function parseGithubWikiIndex(html: string): WikiIndexPage[] {
  const $ = load(html);
  const pages = new Map<string, WikiIndexPage>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    const id = href ? wikiSlugFromHref(href) : null;
    if (!id || isIgnoredSlug(id) || pages.has(id)) return;

    const row = $(element).closest(".Box-row, li, tr");
    const updatedAt = row.find("relative-time").first().attr("datetime") ?? null;
    const label = cleanText($(element).text());
    pages.set(id, {
      id,
      title: label && label.toLowerCase() !== "view" ? label : id,
      updatedAt,
    });
  });

  if (!pages.has("Home")) {
    pages.set("Home", { id: "Home", title: "Home", updatedAt: null });
  }

  const ordered = [...pages.values()];
  ordered.sort((left, right) => {
    if (left.id === "Home") return -1;
    if (right.id === "Home") return 1;
    return left.title.localeCompare(right.title);
  });
  return ordered;
}

export function parseGithubWikiPage(html: string, indexPage: WikiIndexPage): GithubWikiPage {
  const $ = load(html);
  const article = $(".markdown-body").first().clone();
  if (!article.length) throw new Error(`GitHub did not render ${indexPage.id}`);

  article.find("script, style, form, iframe, object, embed, link, meta").remove();
  article.find("*").each((_, element) => {
    const attributes = "attribs" in element
      ? (element.attribs as Record<string, string>)
      : {};
    Object.keys(attributes).forEach((attribute) => {
      if (attribute.toLowerCase().startsWith("on") || attribute === "style") {
        $(element).removeAttr(attribute);
      }
    });
  });

  const outgoingIds: string[] = [];
  article.find("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;
    if (href.startsWith("#")) return;
    let target: URL;
    try {
      target = new URL(href, `${GITHUB_WIKI_ROOT}/${encodeURIComponent(indexPage.id)}`);
    } catch {
      $(element).removeAttr("href");
      return;
    }
    const wikiPath = new URL(GITHUB_WIKI_ROOT).pathname;
    const belongsToCurrentWiki = target.origin === GITHUB_ORIGIN
      && (target.pathname.toLowerCase() === wikiPath.toLowerCase()
        || target.pathname.toLowerCase().startsWith(`${wikiPath.toLowerCase()}/`));
    const internalId = belongsToCurrentWiki ? wikiSlugFromHref(href) : null;
    if (internalId && !isIgnoredSlug(internalId)) {
      if (!outgoingIds.includes(internalId)) outgoingIds.push(internalId);
      $(element).attr("href", `/wiki?page=${encodeURIComponent(internalId)}${target.hash}`);
      $(element).removeAttr("target rel");
      return;
    }

    try {
      const absolute = new URL(href, `${GITHUB_WIKI_ROOT}/${encodeURIComponent(indexPage.id)}`);
      if (absolute.protocol === "https:" || absolute.protocol === "http:") {
        $(element).attr("href", absolute.href);
        $(element).attr("target", "_blank");
        $(element).attr("rel", "noreferrer");
      } else {
        $(element).removeAttr("href");
      }
    } catch {
      $(element).removeAttr("href");
    }
  });

  article.find("img[src]").each((_, element) => {
    const source = $(element).attr("src");
    if (!source) return;
    try {
      const absolute = new URL(source, GITHUB_ORIGIN);
      if (absolute.protocol !== "https:" && absolute.protocol !== "http:") throw new Error();
      $(element).attr("src", absolute.href);
      $(element).attr("loading", "lazy");
      $(element).removeAttr("width height");
    } catch {
      $(element).remove();
    }
  });
  article.find('input[type="checkbox"]').attr("disabled", "disabled");
  renderAlerts(article, $);

  article.find("p").each((_, element) => {
    const meaningfulNodes = $(element).contents().toArray().filter((node) => (
      node.type !== "text" || cleanText("data" in node ? node.data : "")
    ));
    if (meaningfulNodes.length && meaningfulNodes.every((node) => node.type === "tag" && node.tagName === "a")) {
      $(element).attr("data-wiki-link-list", "true");
    }
  });

  const headings: GithubWikiHeading[] = [];
  const usedHeadingIds = new Set<string>();
  article.find("h1, h2, h3").each((_, element) => {
    const title = cleanText($(element).text());
    if (!title) return;
    const base = slugifyHeading($(element).attr("id") || title) || "section";
    let id = base;
    let suffix = 2;
    while (usedHeadingIds.has(id)) id = `${base}-${suffix++}`;
    usedHeadingIds.add(id);
    $(element).attr("id", id);
    const level = element.tagName === "h1" ? 1 : element.tagName === "h3" ? 3 : 2;
    headings.push({ id, level, title });
  });

  const firstParagraph = article.find("p:not([data-wiki-alert-title])").first();
  const summary = firstParagraph.attr("data-wiki-link-list") === "true"
    ? ""
    : cleanText(firstParagraph.text());
  const text = cleanText(article.text());
  renderLatex(article, $);

  return {
    childrenIds: [],
    githubUrl: `${GITHUB_WIKI_ROOT}/${encodeURIComponent(indexPage.id)}`,
    headings,
    html: article.html() ?? "",
    icon: iconForPage(indexPage.id),
    id: indexPage.id,
    navigationTitle: navigationTitleFromSource(indexPage.title, indexPage.id),
    outgoingIds,
    parentId: null,
    summary,
    text,
    title: indexPage.title || indexPage.id,
    updatedAt: indexPage.updatedAt,
  };
}

const wikiAlertTypes = {
  caution: "Caution",
  important: "Important",
  info: "Info",
  note: "Note",
  tip: "Tip",
  warning: "Warning",
} as const;

type WikiAlertType = keyof typeof wikiAlertTypes;

function renderAlerts(
  article: ReturnType<ReturnType<typeof load>>,
  $: ReturnType<typeof load>,
) {
  article.find("blockquote").each((_, element) => {
    const alert = $(element);
    const firstParagraph = alert.children("p").first();
    const existingType = [...(alert.attr("class")?.matchAll(/(?:^|\s)markdown-alert-([a-z]+)(?=\s|$)/gi) ?? [])]
      .map((match) => normaliseAlertType(match[1]))
      .find(Boolean);
    const sourceHtml = firstParagraph.html() ?? "";
    const marker = sourceHtml.match(/^\s*\[!(note|tip|important|warning|caution|info)\]\s*(?:<br\s*\/?\s*>\s*)?/i);
    const type = existingType ?? normaliseAlertType(marker?.[1]);
    if (!type) return;

    const label = wikiAlertTypes[type];
    alert.attr("class", `githubWikiAlert githubWikiAlert-${type}`);
    alert.attr("data-wiki-alert", type);
    alert.attr("role", "note");
    alert.attr("aria-label", label);

    const existingTitle = alert.children(".markdown-alert-title, .githubWikiAlertTitle").first();
    if (existingTitle.length) {
      existingTitle
        .attr("class", "githubWikiAlertTitle")
        .attr("data-wiki-alert-title", "true")
        .text(label);
      return;
    }

    if (marker) {
      const content = sourceHtml.slice(marker[0].length).trim();
      if (content) firstParagraph.html(content);
      else firstParagraph.remove();
    }
    alert.prepend(`<p class="githubWikiAlertTitle" data-wiki-alert-title="true">${label}</p>`);
  });
}

function normaliseAlertType(value: string | undefined): WikiAlertType | undefined {
  const type = value?.toLowerCase();
  return type && type in wikiAlertTypes ? type as WikiAlertType : undefined;
}

function renderLatex(
  article: ReturnType<ReturnType<typeof load>>,
  $: ReturnType<typeof load>,
) {
  const textNodes = article.find("*").addBack().contents().filter((_, node) => node.type === "text");

  textNodes.each((_, node) => {
    const parent = $(node).parent();
    if (parent.closest("code, pre, script, style, textarea, .katex, .math, .math-inline, .math-display").length) return;

    const source = "data" in node ? node.data : "";
    const rendered = renderLatexText(source);
    if (rendered === null) return;
    $(node).replaceWith(rendered);
  });
}

function renderLatexText(source: string) {
  const delimiter = /(\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([^\n]+?)\\\)|(?<!\\)\$(?!\$|\s|\d)([^\n]+?)(?<!\\)\$(?![\d$]))/g;
  let cursor = 0;
  let found = false;
  let html = "";

  for (const match of source.matchAll(delimiter)) {
    const index = match.index;
    const expression = match[2] ?? match[3] ?? match[4] ?? match[5];
    if (!expression?.trim()) continue;

    found = true;
    html += escapeHtml(source.slice(cursor, index));
    html += katex.renderToString(expression.trim(), {
      displayMode: match[2] !== undefined || match[3] !== undefined,
      maxExpand: 1_000,
      output: "htmlAndMathml",
      strict: "ignore",
      throwOnError: false,
      trust: false,
    });
    cursor = index + match[0].length;
  }

  if (!found) return null;
  return html + escapeHtml(source.slice(cursor));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

export function buildGithubWikiTree(inputPages: GithubWikiPage[]): GithubWikiPage[] {
  const pages: GithubWikiPage[] = inputPages.map((page) => ({ ...page, childrenIds: [], parentId: null }));
  const byId = new Map(pages.map((page) => [page.id, page]));
  const assigned = new Set<string>();
  const roots = [byId.get("Home"), ...pages.filter((page) => page.id !== "Home")].filter(Boolean) as GithubWikiPage[];

  for (const root of roots) {
    if (assigned.has(root.id)) continue;
    assigned.add(root.id);
    const queue = [root];
    while (queue.length) {
      const parent = queue.shift();
      if (!parent) break;
      parent.outgoingIds.forEach((childId) => {
        const child = byId.get(childId);
        if (!child || child.id === parent.id || assigned.has(child.id)) return;
        assigned.add(child.id);
        child.parentId = parent.id;
        parent.childrenIds.push(child.id);
        queue.push(child);
      });
    }
  }

  const ordered: GithubWikiPage[] = [];
  const visited = new Set<string>();
  function visit(page: GithubWikiPage) {
    if (visited.has(page.id)) return;
    visited.add(page.id);
    ordered.push(page);
    page.childrenIds.forEach((childId) => {
      const child = byId.get(childId);
      if (child) visit(child);
    });
  }
  roots.filter((page) => page.parentId === null).forEach(visit);
  pages.filter((page) => !visited.has(page.id)).forEach(visit);
  return ordered;
}

function unavailablePage(indexPage: WikiIndexPage): GithubWikiPage {
  const title = indexPage.title || indexPage.id;
  return {
    childrenIds: [],
    githubUrl: `${GITHUB_WIKI_ROOT}/${encodeURIComponent(indexPage.id)}`,
    headings: [],
    html: '<div class="githubWikiUnavailable"><strong>This page could not be loaded from GitHub.</strong><p>The Wiki is still available at its source. Try again shortly or open it on GitHub.</p></div>',
    icon: iconForPage(indexPage.id),
    id: indexPage.id,
    navigationTitle: navigationTitleFromSource(indexPage.title, indexPage.id),
    outgoingIds: [],
    parentId: null,
    summary: "The GitHub Wiki is temporarily unavailable on this site.",
    text: `${title} GitHub Wiki temporarily unavailable`,
    title,
    updatedAt: indexPage.updatedAt,
  };
}

function wikiSlugFromHref(href: string) {
  const relativePath = href.split(/[?#]/)[0].replace(/^\.\//, "");
  if (!relativePath.startsWith("/") && !relativePath.includes(":")) {
    const relativeSlug = relativePath.split("/").filter(Boolean).at(-1);
    if (relativeSlug && /^[a-z0-9][a-z0-9_%&+.-]*$/i.test(relativeSlug)) {
      try { return decodeURIComponent(relativeSlug).replace(/\.(md|markdown)$/i, ""); } catch { return null; }
    }
  }
  try {
    const url = new URL(href, GITHUB_ORIGIN);
    if (url.hostname !== "github.com") return null;
    const wikiPath = url.pathname.match(/^\/Hyp-ed\/hyped-[^/]+\/wiki\/?/i)?.[0];
    if (!wikiPath) return null;
    const encodedSlug = url.pathname.slice(wikiPath.length).split("/").filter(Boolean).at(-1);
    if (!encodedSlug && url.pathname.replace(/\/$/, "") === wikiPath.replace(/\/$/, "")) return "Home";
    return encodedSlug ? decodeURIComponent(encodedSlug).replace(/\.(md|markdown)$/i, "") : null;
  } catch {
    return null;
  }
}

function fallbackNavigation(pages: GithubWikiPage[]): GithubWikiNavigationItem[] {
  return pages.map((page) => ({
    icon: page.icon,
    id: `page:${page.id}`,
    kind: "page",
    pageId: page.id,
    parentId: null,
    title: page.navigationTitle,
  }));
}

function isIgnoredSlug(slug: string) {
  return ignoredSlugs.has(slug.toLowerCase());
}

function iconForPage(slug: string) {
  const name = slug.toLowerCase();
  if (slug === "Home") return "⌂";
  if (name.includes("overview")) return "◎";
  if (name.includes("board")) return "▦";
  if (name.includes("sensor") || name.includes("imd")) return "◉";
  if (name.includes("protocol") || name.includes("telemetry")) return "⌁";
  if (name.includes("state")) return "◇";
  return "·";
}

function navigationTitleFromSource(title: string, id: string) {
  const source = title || id;
  if (!source.includes("_") && !source.includes("-")) return source;
  return source
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanMarkdownLabel(value: string) {
  return cleanText(value
    .replace(/\\([\\`*_[\]{}()#+.!~-])/g, "$1")
    .replace(/\*\*|__|~~|`/g, ""));
}

function slugifyHeading(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function githubHeaders() {
  return {
    Accept: "text/html",
    "User-Agent": "HYPED-Web-Wiki",
  };
}
