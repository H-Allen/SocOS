"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { SearchIcon } from "@/components/icons";
import {
  societySearchResponseSchema,
  type SocietySearchKind,
  type SocietySearchResult,
} from "@/domain/search";

import styles from "./society.module.css";

type SocietySearchProps = {
  onClose: () => void;
  onOpen: () => void;
  open: boolean;
};

const kindLabels: Record<SocietySearchKind, string> = {
  onboarding: "Start here",
  people: "People",
  teams: "Teams",
  wiki: "Wiki",
};

export function SocietySearch({
  onClose,
  onOpen,
  open,
}: SocietySearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SocietySearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const closeAndReset = useCallback(() => {
    setQuery("");
    setResults([]);
    setSelectedIndex(0);
    setStatus("idle");
    onClose();
  }, [onClose]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        onOpen();
      }
      if (event.key === "Escape" && open) closeAndReset();
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [closeAndReset, onOpen, open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/public/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Search failed");
        const payload = societySearchResponseSchema.parse(await response.json());
        setResults(payload.results);
        setSelectedIndex(0);
        setStatus("ready");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResults([]);
        setStatus("error");
      }
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  if (!open) return null;

  const quickLinks = [
    { href: "/", icon: "⌂", label: "Home" },
    { href: "/start", icon: "→", label: "Start here" },
    { href: "/wiki", icon: "▤", label: "Technical Wiki" },
    { href: "/teams", icon: "⌘", label: "Teams" },
    { href: "/people", icon: "◎", label: "People" },
  ];

  function openResult(href: string) {
    closeAndReset();
    router.push(href);
  }

  function handleKeys(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((current) => (current + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((current) => (current - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const result = results[selectedIndex];
      if (result) openResult(result.href);
    }
  }

  return (
    <div className={styles.searchLayer}>
      <button aria-label="Close search" className={styles.searchBackdrop} onClick={closeAndReset} type="button" />
      <section aria-label="Search HYPED" aria-modal="true" className={styles.searchDialog} role="dialog">
        <div className={styles.searchInputRow}>
          <SearchIcon />
          <input
            aria-label="Search HYPED"
            autoComplete="off"
            onChange={(event) => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              setSelectedIndex(0);
              setResults([]);
              setStatus(nextQuery.trim().length >= 2 ? "loading" : "idle");
            }}
            onKeyDown={handleKeys}
            placeholder="Search pages, people and onboarding…"
            ref={inputRef}
            type="search"
            value={query}
          />
          <button aria-label="Close search" onClick={closeAndReset} type="button">ESC</button>
        </div>

        <div className={styles.searchBody}>
          {query.trim().length < 2 ? (
            <>
              <p className={styles.searchEyebrow}>Jump to</p>
              <div className={styles.searchQuickLinks}>
                {quickLinks.map((item) => (
                  <Link href={item.href} key={item.href} onClick={closeAndReset}>
                    <span>{item.icon}</span>{item.label}<b>→</b>
                  </Link>
                ))}
              </div>
              <p className={styles.searchHint}>Try a skill, team, person, project or question.</p>
            </>
          ) : status === "loading" ? (
            <div className={styles.searchMessage}><span>···</span><strong>Looking through HYPED</strong></div>
          ) : status === "error" ? (
            <div className={styles.searchMessage}><span>!</span><strong>Search could not load</strong><p>Close this and try again in a moment.</p></div>
          ) : results.length ? (
            <div className={styles.searchResults} role="listbox">
              <p className={styles.searchEyebrow}>{results.length} {results.length === 1 ? "result" : "results"}</p>
              {results.map((result, index) => (
                <button
                  aria-selected={selectedIndex === index}
                  className={selectedIndex === index ? styles.searchResultSelected : undefined}
                  key={result.id}
                  onClick={() => openResult(result.href)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  role="option"
                  type="button"
                >
                  <span className={styles.searchResultIcon}>{result.icon}</span>
                  <span className={styles.searchResultCopy}>
                    <strong>{result.title}</strong>
                    <small>{kindLabels[result.kind]}</small>
                    <p>{result.excerpt}</p>
                  </span>
                  <b>↵</b>
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.searchMessage}><span>⌕</span><strong>Nothing found for “{query.trim()}”</strong><p>Try a broader word, a team name or someone’s skill.</p></div>
          )}
        </div>

        <footer className={styles.searchFooter}>
          <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
          <span><kbd>↵</kbd> open</span>
          <span>Searches this society only</span>
        </footer>
      </section>
    </div>
  );
}
