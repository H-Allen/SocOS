"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { SearchIcon } from "@/components/icons";
import {
  societySearchResponseSchema,
  type SocietySearchResult,
} from "@/domain/search";

import styles from "./society.module.css";
import { Modal } from "./modal";

type SocietySearchProps = {
  onClose: () => void;
  onOpen: () => void;
  open: boolean;
  pages: Array<{ id: string; title: string }>;
};

export function SocietySearch({
  onClose,
  onOpen,
  open,
  pages,
}: SocietySearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SocietySearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [attempt, setAttempt] = useState(0);
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
  }, [open, query, attempt]);

  if (!open) return null;

  const quickLinks = Array.from(new Map(pages.map((page) => [page.id, page])).values()).slice(0, 8);

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
    <Modal className={styles.searchDialog} label="Search HYPED" onClose={closeAndReset}>
        <div className={styles.searchInputRow}>
          <SearchIcon />
          <input
            aria-label="Search HYPED"
            aria-controls="search-results"
            aria-expanded={results.length > 0}
            aria-activedescendant={results.length ? `search-result-${selectedIndex}` : undefined}
            aria-autocomplete="list"
            role="combobox"
            autoComplete="off"
            onChange={(event) => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              setSelectedIndex(0);
              setResults([]);
              setStatus(nextQuery.trim().length >= 2 ? "loading" : "idle");
            }}
            onKeyDown={handleKeys}
            placeholder="Search the Wiki…"
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
                  <Link href={`/wiki?page=${encodeURIComponent(item.id)}`} key={item.id} onClick={closeAndReset}>
                    {item.title}<b aria-hidden="true">→</b>
                  </Link>
                ))}
              </div>
              <p className={styles.searchHint}>Search page titles and content from the GitHub Wiki.</p>
            </>
          ) : status === "loading" ? (
            <div className={styles.searchMessage} role="status"><strong>Searching…</strong></div>
          ) : status === "error" ? (
            <div className={styles.searchMessage} role="alert"><strong>Search could not load</strong><p>Check your connection and try again.</p><button className={styles.stepAction} onClick={() => { setStatus("loading"); setAttempt((value) => value + 1); }} type="button">Retry search</button></div>
          ) : results.length ? (
            <div aria-label="Search results" className={styles.searchResults} id="search-results" role="listbox">
              <p className={styles.searchEyebrow}>{results.length} {results.length === 1 ? "result" : "results"}</p>
              {results.map((result, index) => (
                <button
                  aria-selected={selectedIndex === index}
                  className={selectedIndex === index ? styles.searchResultSelected : undefined}
                  key={result.id}
                  id={`search-result-${index}`}
                  tabIndex={-1}
                  onClick={() => openResult(result.href)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  role="option"
                  type="button"
                >
                  <span className={styles.searchResultCopy}>
                    <strong>{result.title}</strong>
                    <small>Wiki</small>
                    <p>{result.excerpt}</p>
                  </span>
                  <b>↵</b>
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.searchMessage} role="status"><strong>Nothing found for “{query.trim()}”</strong><p>Try another name or topic.</p></div>
          )}
        </div>

        <footer className={styles.searchFooter}>
          <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
          <span><kbd>↵</kbd> open</span>
          <span>HYPED Wiki</span>
        </footer>
    </Modal>
  );
}
