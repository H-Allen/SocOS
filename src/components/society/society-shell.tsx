"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useState, type ReactNode } from "react";

import { ChevronRightIcon, ExternalIcon, SearchIcon } from "@/components/icons";

import { SocietySearch } from "./society-search";
import { EditorAuthControl } from "./editor-auth-control";
import styles from "./society.module.css";

type WikiNavigationItem = {
  icon: string;
  id: string;
  kind: "directory" | "page";
  pageId: string | null;
  parentId: string | null;
  title: string;
};

export function SocietyShell({
  activeWikiPageId,
  children,
  editorEmail,
  editorPhotoUrl,
  indexNavigation = [],
  wikiNavigation = [],
}: {
  activeWikiPageId?: string;
  children: ReactNode;
  editorEmail?: string;
  editorPhotoUrl?: string;
  indexNavigation?: WikiNavigationItem[];
  wikiNavigation?: WikiNavigationItem[];
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const wikiLinks = decorateWikiNavigation(wikiNavigation);
  const [collapsedWikiItems, setCollapsedWikiItems] = useState<Set<string>>(() => initialCollapsedWikiItems(wikiNavigation, activeWikiPageId));
  const isCollapsed = (itemId: string) => collapsedWikiItems.has(itemId);
  const visibleWikiLinks = wikiLinks.filter((item) => item.ancestorIds.every((ancestorId) => !isCollapsed(ancestorId)));

  return (
    <div className={styles.appShell} data-society-shell>
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <aside className={styles.sidebar}>
        <Link aria-label="Wiki home" href="/" className={styles.societySwitcher}>
          <HypedMark className={styles.societyLogo} />
        </Link>

        <button aria-label="Search HYPED" aria-keyshortcuts="Meta+K Control+K" className={styles.searchButton} onClick={openSearch} type="button"><SearchIcon /><span>Search</span><kbd aria-hidden="true">⌘ K</kbd></button>

        <div className={`${styles.sidebarSection} ${styles.sidebarWikiSection}`}>
          {indexNavigation.length > 0 && (
            <nav aria-label="Main pages" className={styles.indexNavigation}>
              {indexNavigation.map((item) => (
                <Link aria-current={activeWikiPageId === item.pageId ? "page" : undefined} href={`/wiki?page=${encodeURIComponent(item.pageId!)}`} key={item.id}>{item.title}</Link>
              ))}
            </nav>
          )}
          {(wikiNavigation.length > 0 || indexNavigation.length === 0) && <>
          <div className={styles.sidebarLabel}>Wiki</div>
          <nav aria-label="Wiki" className={styles.sidebarWikiList}>
            {wikiNavigation.length === 0 && <Link className={styles.sidebarWikiLink} href="/wiki">Open Wiki</Link>}
            {visibleWikiLinks.map((item) => (
              <div className={styles.sidebarWikiRow} data-active={activeWikiPageId === item.pageId} data-depth={item.depth} data-kind={item.kind} key={item.id} style={{ marginLeft: item.depth * 12 }}>
                {item.hasChildren ? (
                  <button
                    aria-expanded={!isCollapsed(item.id)}
                    aria-label={`${isCollapsed(item.id) ? "Expand" : "Collapse"} ${item.title}`}
                    className={styles.sidebarWikiToggle}
                    onClick={() => setCollapsedWikiItems((current) => toggleWikiItem(current, item.id))}
                    type="button"
                  >
                    <ChevronRightIcon />
                  </button>
                ) : <span aria-hidden="true" className={styles.sidebarWikiSpacer} />}
                {item.kind === "page" && item.pageId ? (
                  <Link aria-current={activeWikiPageId === item.pageId ? "page" : undefined} className={styles.sidebarWikiLink} href={`/wiki?page=${encodeURIComponent(item.pageId)}`} title={item.title}><b>{item.title}</b></Link>
                ) : (
                  <button aria-expanded={!isCollapsed(item.id)} className={`${styles.sidebarWikiLink} ${styles.sidebarWikiDirectory}`} onClick={() => setCollapsedWikiItems((current) => toggleWikiItem(current, item.id))} type="button"><b>{item.title}</b></button>
                )}
              </div>
            ))}
          </nav>
          </>}
        </div>

        <div className={styles.sidebarBottom}>
          <a href="https://hyp-ed.com" rel="noreferrer" target="_blank">Public website <ExternalIcon /></a>
          <a href="https://github.com/Hyp-ed" rel="noreferrer" target="_blank">GitHub <ExternalIcon /></a>
          <EditorAuthControl email={editorEmail} photoUrl={editorPhotoUrl} />
        </div>
      </aside>

      <header className={styles.mobileBar}>
        <Link className={styles.mobileSociety} href="/"><HypedMark className={styles.mobileSocietyLogo} /></Link>
        <nav aria-label="Mobile navigation">
          <EditorAuthControl email={editorEmail} photoUrl={editorPhotoUrl} />
          <button aria-label="Search HYPED" onClick={openSearch} type="button"><SearchIcon /></button>
        </nav>
      </header>

      <main className={styles.main} id="main-content" tabIndex={-1}>{children}</main>
      <SocietySearch pages={[...indexNavigation, ...wikiNavigation].flatMap((item) => item.pageId ? [{ id: item.pageId, title: item.title }] : [])} onClose={closeSearch} onOpen={openSearch} open={searchOpen} />
    </div>
  );
}

function toggleWikiItem(current: Set<string>, itemId: string) {
  const next = new Set(current);
  if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
  return next;
}

function HypedMark({ className }: { className?: string }) {
  return <span aria-label="HYPED — Hyperloop Edinburgh" className={className} role="img"><Image alt="" height={541} priority src="/hyped-logo.png" width={1900} /></span>;
}

function decorateWikiNavigation(items: WikiNavigationItem[]) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const parentIds = new Set(items.flatMap((item) => item.parentId ? [item.parentId] : []));
  return items.map((item) => {
    const ancestorIds: string[] = [];
    const seen = new Set<string>();
    let parentId = item.parentId;
    while (parentId && !seen.has(parentId)) {
      seen.add(parentId);
      ancestorIds.unshift(parentId);
      parentId = byId.get(parentId)?.parentId ?? null;
    }
    return { ...item, ancestorIds, depth: Math.min(ancestorIds.length, 5), hasChildren: parentIds.has(item.id) };
  });
}

function initialCollapsedWikiItems(items: WikiNavigationItem[], activePageId?: string) {
  const activePath = wikiNavigationPath(items, activePageId);
  const parentIds = new Set(items.flatMap((item) => item.parentId ? [item.parentId] : []));
  return new Set(items.filter((item) => parentIds.has(item.id) && !activePath.has(item.id)).map((item) => item.id));
}

function wikiNavigationPath(items: WikiNavigationItem[], activePageId?: string) {
  const path = new Set<string>();
  if (!activePageId) return path;
  const byId = new Map(items.map((item) => [item.id, item]));
  let currentId: string | null | undefined = items.find((item) => item.pageId === activePageId)?.id;
  while (currentId && !path.has(currentId)) { path.add(currentId); currentId = byId.get(currentId)?.parentId; }
  return path;
}
