import Link from "next/link";

import type { GithubWikiNavigationItem, GithubWikiPage as GithubWikiPageData, GithubWikiSnapshot } from "@/lib/github-wiki.server";

import { GithubWikiCopyLink, GithubWikiPageSelect } from "./github-wiki-actions";
import { SocietyDocumentCover } from "./society-document";
import styles from "./society.module.css";

type GithubWikiPageProps = {
  bannerImageUrl?: string | null;
  bannerPosition?: number;
  canEdit?: boolean;
  indexNavigation: GithubWikiNavigationItem[];
  navigation: GithubWikiNavigationItem[];
  page: GithubWikiPageData;
  status: GithubWikiSnapshot["status"];
};

export function GithubWikiPage({ bannerImageUrl, bannerPosition, canEdit, indexNavigation, navigation, page, status }: GithubWikiPageProps) {
  const isIndexPage = indexNavigation.some((item) => item.pageId === page.id);
  const breadcrumbs = pageBreadcrumbs(page, isIndexPage ? indexNavigation : navigation);
  const mainPages = indexNavigation.flatMap((item) => item.pageId ? [{ id: item.pageId, title: item.title }] : []);
  const navigationPages = Array.from(new Map(navigation.flatMap((item) => item.pageId
    ? [[item.pageId, { id: item.pageId, title: item.title }] as const]
    : [])).values());
  if (!isIndexPage && !navigationPages.some((item) => item.id === page.id)) {
    navigationPages.push({ id: page.id, title: page.navigationTitle });
  }
  const updatedAt = formatUpdatedAt(page.updatedAt);
  const wordCount = page.text.trim().split(/\s+/).filter(Boolean).length;
  const readingMinutes = status !== "unavailable" && wordCount ? Math.max(1, Math.ceil(wordCount / 200)) : null;

  return (
    <article>
      <div className={styles.societyDocumentToolbar}>
        <div className={styles.societyDocumentTrail}>
          <span className={styles.wikiBreadcrumbs} data-main-page={isIndexPage}>
            {!isIndexPage && <Link href="/wiki">Wiki</Link>}
            {breadcrumbs.map((crumb) => (
              <span key={crumb.id}>
                {!isIndexPage && <i>/</i>}
                {crumb.pageId && crumb.pageId !== page.id
                  ? <Link href={`/wiki?page=${encodeURIComponent(crumb.pageId)}`}>{crumb.title}</Link>
                  : <b>{crumb.title}</b>}
              </span>
            ))}
          </span>
        </div>
        <div className={styles.societyDocumentActions}>
          <GithubWikiPageSelect
            activePageId={page.id}
            mainPages={mainPages}
            pages={navigationPages}
          />
          <GithubWikiCopyLink />
          <a href={page.githubUrl} rel="noreferrer" target="_blank">Open on GitHub ↗</a>
        </div>
      </div>

      <header>
        <SocietyDocumentCover bannerPage={page.id} canEdit={canEdit} imageUrl={bannerImageUrl} positionY={bannerPosition} />
        <div className={styles.societyDocumentIdentity}>
          <div aria-hidden="true" className={styles.documentSymbol}>
            {page.icon && page.icon !== "·" ? page.icon : (
              <svg viewBox="0 0 32 32" fill="none" focusable="false">
                <path d="M7 5h12l6 6v16H7Z M19 5v7h6 M11 17h10 M11 22h7" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <h1>{page.title}</h1>
          {(updatedAt || readingMinutes) && (
            <div className={styles.githubWikiMeta}>
              {updatedAt && <span>Updated <strong><time dateTime={page.updatedAt!}>{updatedAt}</time></strong></span>}
              {readingMinutes && <span title="Estimated at 200 words per minute">Reading time <strong>{readingMinutes} min</strong></span>}
            </div>
          )}
        </div>
      </header>

      <div className={styles.wikiReadingLayout}>
        <div className={styles.wikiDocument}>
          {status !== "live" && (
            <div className={styles.githubWikiSyncNotice} role="status">
              <strong>{status === "partial" ? "Some Wiki content or navigation could not be refreshed." : "The Wiki could not be refreshed."}</strong>
              <span>You can read the source directly on GitHub while we reconnect.</span>
            </div>
          )}

          <div
            className={`${styles.wikiRenderedBody} ${styles.githubWikiBody}`}
            dangerouslySetInnerHTML={{ __html: /<h1[\s>]/i.test(page.html)
              ? page.html.replace(/<(\/?)h([1-6])(?=[\s>])/gi, (_, close, level) => `<${close}h${Math.min(Number(level) + 1, 6)}`)
              : page.html }}
          />
        </div>

        {page.headings.length > 0 && (
          <nav aria-label="On this page" className={styles.wikiPageOutline}>
            <span>ON THIS PAGE</span>
            {page.headings.map((heading) => (
              <a href={`#${heading.id}`} key={heading.id} style={{ paddingLeft: heading.level === 3 ? 9 : 0 }}>
                {heading.title}
              </a>
            ))}
          </nav>
        )}
      </div>
    </article>
  );
}

function pageBreadcrumbs(page: GithubWikiPageData, navigation: GithubWikiNavigationItem[]) {
  const breadcrumbs: GithubWikiNavigationItem[] = [];
  const byId = new Map(navigation.map((item) => [item.id, item]));
  const visited = new Set<string>();
  let current = navigation.find((item) => item.pageId === page.id);
  if (!current) return [{ icon: page.icon, id: `page:${page.id}`, kind: "page" as const, pageId: page.id, parentId: null, title: page.navigationTitle }];
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    breadcrumbs.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return breadcrumbs;
}

function formatUpdatedAt(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
