"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";

import { ChevronRightIcon, ExternalIcon, HomeIcon, PeopleIcon, RouteIcon, SearchIcon, TeamsIcon } from "@/components/icons";

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
  wikiNavigation = [],
}: {
  activeWikiPageId?: string;
  children: ReactNode;
  editorEmail?: string;
  wikiNavigation?: WikiNavigationItem[];
}) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const mainLinks = [
    { href: "/", label: "Home", icon: HomeIcon },
    { href: "/start", label: "Start here", icon: RouteIcon },
    { href: "/teams", label: "Teams", icon: TeamsIcon },
    { href: "/people", label: "People", icon: PeopleIcon },
  ];
  const wikiLinks = decorateWikiNavigation(wikiNavigation);
  const [collapsedWikiItems, setCollapsedWikiItems] = useState<Set<string>>(() => initialCollapsedWikiItems(wikiNavigation, activeWikiPageId));
  const isCollapsed = (itemId: string) => collapsedWikiItems.has(itemId);
  const visibleWikiLinks = wikiLinks.filter((item) => item.ancestorIds.every((ancestorId) => !isCollapsed(ancestorId)));

  return (
    <div className={styles.appShell} data-society-shell>
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <aside className={styles.sidebar}>
        <div className={styles.societySwitcher}>
          <HypedMark className={styles.societyLogo} />
        </div>

        <button aria-label="Search HYPED" className={styles.searchButton} onClick={openSearch} type="button"><SearchIcon /><span>Search</span><kbd>K</kbd></button>

        <nav aria-label="Main navigation" className={styles.mainNav}>
          {mainLinks.map(({ href, icon: Icon, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return <Link className={active ? styles.navActive : ""} href={href} key={href}><Icon />{label}</Link>;
          })}
        </nav>

        <div className={`${styles.sidebarSection} ${styles.sidebarWikiSection}`}>
          <div className={styles.sidebarLabel}><span>Technical Wiki</span><small>GitHub</small></div>
          <nav aria-label="Technical Wiki" className={styles.sidebarWikiList}>
            {visibleWikiLinks.map((item) => (
              <div className={styles.sidebarWikiRow} data-active={activeWikiPageId === item.pageId} data-depth={item.depth} data-kind={item.kind} key={item.id} style={{ marginLeft: item.depth * 16 }}>
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
                  <button className={`${styles.sidebarWikiLink} ${styles.sidebarWikiDirectory}`} onClick={() => setCollapsedWikiItems((current) => toggleWikiItem(current, item.id))} type="button"><b>{item.title}</b></button>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className={styles.sidebarBottom}>
          <EditorAuthControl email={editorEmail} />
          <a href="https://hyp-ed.com" rel="noreferrer" target="_blank">Public website <ExternalIcon /></a>
          <a href="https://github.com/Hyp-ed" rel="noreferrer" target="_blank">GitHub <ExternalIcon /></a>
        </div>
      </aside>

      <div className={styles.mobileBar}>
        <Link className={styles.mobileSociety} href="/"><HypedMark className={styles.mobileSocietyLogo} /></Link>
        <nav aria-label="Society mobile navigation">
          {mainLinks.filter(({ href }) => href !== "/").map(({ href, label }) => <Link href={href} key={href}>{label}</Link>)}
          <button aria-label="Search HYPED" onClick={openSearch} type="button"><SearchIcon /></button>
        </nav>
      </div>

      <main className={styles.main} id="main-content">{children}</main>
      <SocietySearch onClose={closeSearch} onOpen={openSearch} open={searchOpen} />
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
