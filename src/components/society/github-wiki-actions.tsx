"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./society.module.css";

export function GithubWikiCopyLink() {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button onClick={copyLink} type="button">
      {copied ? "Link copied" : "Copy link"}
    </button>
  );
}

export function GithubWikiPageSelect({
  activePageId,
  pages,
}: {
  activePageId: string;
  pages: Array<{ id: string; title: string }>;
}) {
  const router = useRouter();
  return (
    <select
      aria-label="Choose a Wiki page"
      className={styles.wikiPagePicker}
      defaultValue={activePageId}
      onChange={(event) => {
        router.push(`/wiki?page=${encodeURIComponent(event.target.value)}`);
      }}
    >
      {pages.map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}
    </select>
  );
}
