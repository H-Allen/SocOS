import type { GithubWikiNavigationItem, GithubWikiPage } from "@/lib/github-wiki.server";

export const INDEX_DIRECTORY = "index";

export function wikiPageIdFromPath(path: string) {
  const name = path.split("/").at(-1) ?? "";
  if (!/\.(md|markdown)$/i.test(name) || name.startsWith("_") || name.startsWith(".")) return null;
  return name.replace(/\.(md|markdown)$/i, "").replace(/ /g, "-");
}

export function indexPageIds(paths: string[]) {
  const byId = new Map<string, string[]>();
  for (const path of paths) {
    const id = wikiPageIdFromPath(path);
    if (!id) continue;
    const matches = byId.get(id.toLowerCase()) ?? [];
    matches.push(path);
    byId.set(id.toLowerCase(), matches);
  }
  // Wiki URLs are flat. An ambiguous filename must not promote the wrong page.
  return [...byId.values()].flatMap((matches) => matches.length === 1 && matches[0].startsWith(`${INDEX_DIRECTORY}/`)
    ? [wikiPageIdFromPath(matches[0])!]
    : []);
}

export function splitWikiPages(
  pages: GithubWikiPage[],
  navigation: GithubWikiNavigationItem[],
  paths: string[],
) {
  const ids = new Set(indexPageIds(paths).map((id) => id.toLowerCase()));
  const order = new Map(navigation.flatMap((item, index) => item.pageId ? [[item.pageId, index] as const] : []));
  const indexPages = pages.filter((page) => ids.has(page.id.toLowerCase())).sort((left, right) => {
    if (left.id.toLowerCase() === "home") return -1;
    if (right.id.toLowerCase() === "home") return 1;
    return (order.get(left.id) ?? Infinity) - (order.get(right.id) ?? Infinity)
      || left.navigationTitle.localeCompare(right.navigationTitle);
  });
  return {
    indexNavigation: indexPages.map((page): GithubWikiNavigationItem => ({
      id: `page:${page.id}`, pageId: page.id, title: page.navigationTitle,
      kind: "page", parentId: null, icon: page.icon,
    })),
    wikiPages: pages.filter((page) => !ids.has(page.id.toLowerCase())),
  };
}
