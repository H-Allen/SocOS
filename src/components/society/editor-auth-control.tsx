"use client";

import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getBrowserAuth } from "@/lib/firebase/client";

import styles from "./society.module.css";

export function EditorAuthControl({ email }: { email?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    setBusy(true);
    setError("");
    try {
      const auth = await getBrowserAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(auth, provider);
      const idToken = await credential.user.getIdToken(true);
      const response = await fetch("/api/auth/session", {
        body: JSON.stringify({ idToken }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        await firebaseSignOut(auth);
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error ?? "This Google account is not approved.");
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Google sign-in did not complete.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      const auth = await getBrowserAuth().catch(() => null);
      if (auth) await firebaseSignOut(auth);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.editorAuth}>
      {email ? (
        <button disabled={busy} onClick={signOut} title={`Signed in as ${email}`} type="button">
          <span className={styles.editorStatusDot} /> {busy ? "Signing out…" : "Editor · Sign out"}
        </button>
      ) : (
        <button disabled={busy} onClick={signIn} type="button">
          <span className={styles.googleMark}>G</span> {busy ? "Opening Google…" : "Editor sign in"}
        </button>
      )}
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
