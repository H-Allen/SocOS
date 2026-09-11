import "server-only";

import { getGithubWikiSnapshot } from "@/lib/github-wiki.server";

export async function getHypedPageContext() {
  const wiki = await getGithubWikiSnapshot();
  return {
    wiki,
    wikiPages: wiki.pages,
  };
}
