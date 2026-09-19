"use client";

import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getBrowserAuth } from "@/lib/firebase/client";

import styles from "./society.module.css";

export function EditorAuthControl({ email, photoUrl }: { email?: string; photoUrl?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string>();

  useEffect(() => {
    // Initialize before the click so opening the OAuth popup needn't wait on a request.
    void getBrowserAuth().catch(() => undefined);
  }, []);

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
      const code = cause && typeof cause === "object" && "code" in cause ? cause.code : null;
      if (code === "auth/unauthorized-domain") {
        setError("This website's domain must be added to Firebase Authentication’s authorized domains.");
      } else if (code === "auth/operation-not-allowed") {
        setError("Google sign-in must be enabled in Firebase Authentication.");
      } else if (code === "auth/popup-blocked") {
        setError("Your browser blocked the sign-in window. Allow popups for this site and try again.");
      } else if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setError(cause instanceof Error ? cause.message : "Google sign-in did not complete.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/session", { method: "DELETE" });
      if (!response.ok) throw new Error("Sign-out failed. Try again.");
      const auth = await getBrowserAuth().catch(() => null);
      if (auth) await firebaseSignOut(auth);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-out failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.editorAuth}>
      {email ? (
        <button aria-label={`Sign out of ${email}`} disabled={busy} onClick={signOut} title={`Signed in as ${email}`} type="button">
          {photoUrl && photoUrl !== failedPhotoUrl ? (
            <Image alt="" className={styles.editorAvatar} height={24} onError={() => setFailedPhotoUrl(photoUrl)} referrerPolicy="no-referrer" src={photoUrl} unoptimized width={24} />
          ) : (
            <span aria-hidden="true" className={styles.editorAvatar}>{email.charAt(0).toUpperCase()}</span>
          )}
          {busy ? "Signing out…" : "Sign out"}
        </button>
      ) : (
        <button disabled={busy} onClick={signIn} type="button">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      )}
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
