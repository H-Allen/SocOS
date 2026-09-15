import Link from "next/link";
import { SocietyShell } from "@/components/society/society-shell";
import styles from "@/components/society/society.module.css";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata = { ...pageMetadata("Page not found · HYPED", "This address does not match a HYPED page."), robots: { index: false } };

export default function NotFound() {
  return <SocietyShell><section className={styles.pageContent}>
    <div className={styles.pageIdentity}><h1>Page not found</h1><p>This address does not match a HYPED page. Check the link or use the navigation.</p></div>
    <div className={styles.quickLinks}><Link href="/">Wiki home</Link></div>
  </section></SocietyShell>;
}
