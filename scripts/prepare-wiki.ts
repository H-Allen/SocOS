import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { getGithubWikiSnapshot, GITHUB_WIKI_REPOSITORY } from "../src/lib/github-wiki.server";
import { validateSnapshot } from "../src/domain/wiki-snapshot";

async function main() {
  const target = resolve("src/generated/wiki-snapshot.json");
  const sourceUrl = `https://github.com/${GITHUB_WIKI_REPOSITORY}/wiki`;
  const snapshot = await getGithubWikiSnapshot();
  if (snapshot.status !== "live") {
    // An upstream outage must not replace the last successful build snapshot.
    validateSnapshot(JSON.parse(await readFile(target, "utf8")), sourceUrl);
    console.warn("Wiki refresh unavailable. Building with the existing saved snapshot.");
    return;
  }
  validateSnapshot(snapshot, sourceUrl);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(snapshot));
  console.log(`Prepared ${snapshot.pages.length} Wiki pages for ${GITHUB_WIKI_REPOSITORY}.`);
}

main().catch((error) => { console.error("Cannot prepare Wiki snapshot:", error.message); process.exitCode = 1; });
