"use client";

import Link from "next/link";
import { SocietyShell } from "@/components/society/society-shell";
import styles from "@/components/society/society.module.css";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <SocietyShell><section className={styles.pageContent}>
    <div className={styles.pageIdentity}><h1>Unable to load this page</h1><p role="alert">The request failed. Try again or return to Wiki Home.</p></div>
    <div className={styles.quickLinks}><button className={styles.stepAction} onClick={retry} type="button">Try again</button><Link href="/">Wiki home</Link></div>
  </section></SocietyShell>;
}
