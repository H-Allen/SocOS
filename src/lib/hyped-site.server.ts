import "server-only";
import { cache } from "react";

import { getGithubWikiSnapshot } from "@/lib/github-wiki.server";

export const getHypedPageContext = cache(async () => {
  const wiki = await getGithubWikiSnapshot();
  return {
    wiki,
    wikiPages: wiki.pages,
  };
});
