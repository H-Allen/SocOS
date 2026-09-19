import "server-only";
import { cache } from "react";

import { getCachedWikiSnapshot } from "@/lib/wiki-cache.server";

export const getHypedPageContext = cache(async () => {
  const wiki = getCachedWikiSnapshot();
  return {
    wiki,
    wikiPages: wiki.pages,
  };
});
