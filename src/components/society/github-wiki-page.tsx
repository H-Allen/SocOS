import Link from "next/link";

import type { GithubWikiNavigationItem, GithubWikiPage as GithubWikiPageData, GithubWikiSnapshot } from "@/lib/github-wiki.server";

import { GithubWikiCopyLink, GithubWikiPageSelect } from "./github-wiki-actions";
import { SocietyDocumentCover } from "./society-document";
import styles from "./society.module.css";

type GithubWikiPageProps = {
  bannerImageUrl?: string | null;
  bannerPosition?: number;
  canEdit?: boolean;
  navigation: GithubWikiNavigationItem[];
  page: GithubWikiPageData;
  status: GithubWikiSnapshot["status"];
};

export function GithubWikiPage({ bannerImageUrl, bannerPosition, canEdit, navigation, page, status }: GithubWikiPageProps) {
  const breadcrumbs = pageBreadcrumbs(page, navigation);
  const navigationPages = navigation.flatMap((item) => item.pageId ? [{ id: item.pageId, title: item.title }] : []);
  if (!navigationPages.some((item) => item.id === page.id)) {
    navigationPages.push({ id: page.id, title: page.navigationTitle });
  }
  const statusLabel = status === "live"
    ? "Live from GitHub"
    : status === "partial" ? "GitHub · partial sync" : "GitHub unavailable";

  return (
    <article className={`${styles.githubWikiPage} ${styles.wikiWorkspace}`}>
      <div className={styles.societyDocumentToolbar}>
        <div className={styles.societyDocumentTrail}>
          <span className={styles.wikiBreadcrumbs}>
            <Link href="/wiki">Wiki</Link>
            {breadcrumbs.map((crumb) => (
              <span key={crumb.id}>
                <i>/</i>
                {crumb.pageId && crumb.pageId !== page.id
                  ? <Link href={`/wiki?page=${encodeURIComponent(crumb.pageId)}`}>{crumb.title}</Link>
                  : <b>{crumb.title}</b>}
              </span>
            ))}
          </span>
          <small data-state={status === "live" ? "published" : "draft"}>{statusLabel}</small>
        </div>
        <div className={styles.societyDocumentActions}>
          <GithubWikiPageSelect
            activePageId={page.id}
            pages={navigationPages}
          />
          <GithubWikiCopyLink />
          <a href={page.githubUrl} rel="noreferrer" target="_blank">Open on GitHub ↗</a>
        </div>
      </div>

      <header className={styles.societyDocumentHeader}>
        <SocietyDocumentCover bannerPage="wiki" canEdit={canEdit} imageUrl={bannerImageUrl} label="HYPED / TECHNICAL WIKI" positionY={bannerPosition} tone="wiki" />
        <div className={styles.societyDocumentIdentity}>
          <div className={styles.societyDocumentIcon}>{page.icon}</div>
          <span className={styles.societyDocumentEyebrow}>HYPED 2027 KNOWLEDGE BASE</span>
          <h1>{page.title}</h1>
          <div className={styles.githubWikiMeta}>
            <span>Source <strong>GitHub Wiki</strong></span>
            <span>Updated <strong>{formatUpdatedAt(page.updatedAt)}</strong></span>
            <span>Refresh <strong>every minute</strong></span>
          </div>
        </div>
      </header>

      {page.id === "Home" && (
        <aside className={styles.githubWikiWelcome}>
          <span>NEW TO HYPED?</span>
          <div>
            <strong>Start with the people and the purpose, then get technical.</strong>
            <p>The member route covers how the team works, where everything lives and what to do first.</p>
          </div>
          <Link href="/start">Open the new member route →</Link>
        </aside>
      )}

      <div className={styles.wikiReadingLayout}>
        <div className={styles.wikiDocument}>
          {status !== "live" && (
            <div className={styles.githubWikiSyncNotice} role="status">
              <strong>{status === "partial" ? "A few Wiki pages could not be refreshed." : "The Wiki could not be refreshed."}</strong>
              <span>The rest of the HYPED site is still working. You can always read the source directly on GitHub.</span>
            </div>
          )}

          <div
            className={`${styles.wikiRenderedBody} ${styles.githubWikiBody}`}
            dangerouslySetInnerHTML={{ __html: page.html }}
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
  if (!value) return "on GitHub";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "on GitHub";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
