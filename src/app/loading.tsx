import { SocietyShell } from "@/components/society/society-shell";
import styles from "@/components/society/society.module.css";

export default function Loading() {
  return <SocietyShell><section aria-busy="true" className={styles.pageContent}>
    <p role="status">Loading HYPED…</p>
    <div aria-hidden="true" className={styles.loadingSkeleton}><div /><div /><div /></div>
  </section></SocietyShell>;
}
