"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import type { BannerPage } from "@/domain/site-banners";

import styles from "./society.module.css";

export function BannerEditor({ hasImage, page, positionY = 50 }: { hasImage: boolean; page: BannerPage; positionY?: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [repositioning, setRepositioning] = useState(false);
  const [draftPosition, setDraftPosition] = useState(positionY);

  async function upload(image: File) {
    if (image.size > 6 * 1024 * 1024) {
      setError("Choose an image smaller than 6 MB.");
      return;
    }
    setBusy(true);
    setError("");
    const body = new FormData();
    setMessage("");
    body.set("page", page);
    body.set("image", image);
    try {
      const response = await fetch("/api/site-banner", { body, method: "POST" });
      if (!response.ok) throw new Error(await response.text() || "The cover could not be changed.");
      setMessage("Cover updated.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The cover could not be changed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function restoreDefault() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/site-banner", {
        body: JSON.stringify({ page }),
        headers: { "content-type": "application/json" },
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await response.text() || "The default cover could not be restored.");
      setMessage("Default banner restored.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The default cover could not be restored.");
    } finally {
      setBusy(false);
    }
  }

  function previewPosition(nextPosition: number) {
    const safePosition = Math.max(0, Math.min(100, nextPosition));
    setDraftPosition(safePosition);
    const cover = rootRef.current?.parentElement;
    if (cover) cover.style.backgroundPosition = `center ${safePosition}%`;
  }

  function cancelRepositioning() {
    previewPosition(positionY);
    setRepositioning(false);
    setError("");
  }

  async function savePosition() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/site-banner", {
        body: JSON.stringify({ page, position: draftPosition }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      if (!response.ok) throw new Error(await response.text() || "The cover position could not be saved.");
      setRepositioning(false);
      setMessage("Cover position saved.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The cover position could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.bannerEditor} data-repositioning={repositioning ? "true" : "false"} ref={rootRef}>
      <input
        accept="image/jpeg,image/png,image/webp"
        aria-label="Choose a new cover image"
        hidden
        onChange={(event) => {
          const image = event.target.files?.[0];
          if (image) void upload(image);
        }}
        ref={inputRef}
        type="file"
      />
      {!repositioning && <button disabled={busy} onClick={() => inputRef.current?.click()} type="button">{busy ? "Updating…" : "Change cover"}</button>}
      {hasImage && !repositioning && <button disabled={busy} onClick={() => {
        setDraftPosition(positionY);
        setRepositioning(true);
        setError("");
      }} type="button">Reposition</button>}
      {hasImage && !repositioning && <button disabled={busy} onClick={restoreDefault} type="button">Use default</button>}
      {repositioning && (
        <>
          <span className={styles.bannerPositionLabel}>Move image</span>
          <input aria-label="Vertical image position" disabled={busy} max="100" min="0" onChange={(event) => previewPosition(Number(event.target.value))} step="1" type="range" value={draftPosition} />
          <button disabled={busy} onClick={savePosition} type="button">{busy ? "Saving…" : "Save"}</button>
          <button disabled={busy} onClick={cancelRepositioning} type="button">Cancel</button>
        </>
      )}
      {error && <small role="alert">{error}</small>}
      {message && !error && <small role="status">{message}</small>}
    </div>
  );
}
