"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./society.module.css";

export function GithubWikiCopyLink() {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copyLink() {
    setFailed(false);
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      setFailed(true);
    }
  }

  return (
    <><button onClick={copyLink} type="button">
      {copied ? "Link copied" : "Copy link"}
    </button><span className={styles.copyStatus} role="status">{failed ? "Copy failed. Copy the address from your browser." : copied ? "Link copied to clipboard." : ""}</span></>
  );
}

export function GithubWikiPageSelect({
  activePageId,
  mainPages,
  pages,
}: {
  activePageId: string;
  mainPages: Array<{ id: string; title: string }>;
  pages: Array<{ id: string; title: string }>;
}) {
  const router = useRouter();
  return (
    <select
      aria-label={mainPages.length ? "Choose a page" : "Choose a Wiki page"}
      className={styles.wikiPagePicker}
      value={activePageId}
      onChange={(event) => {
        router.push(`/wiki?page=${encodeURIComponent(event.target.value)}`);
      }}
    >
      {mainPages.length ? (
        <>
          <optgroup label="Main pages">{mainPages.map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}</optgroup>
          {pages.length > 0 && <optgroup label="Wiki">{pages.map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}</optgroup>}
        </>
      ) : pages.map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}
    </select>
  );
}
