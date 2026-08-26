import type { ReactNode } from "react";

import type { BannerPage } from "@/domain/site-banners";

import { BannerEditor } from "./banner-editor";
import styles from "./society.module.css";

type SocietyDocumentCoverProps = {
  bannerPage?: BannerPage;
  canEdit?: boolean;
  imageUrl?: string | null;
  positionY?: number;
  label: string;
  tone: "people" | "start" | "teams" | "wiki";
};

type SocietyDocumentHeaderProps = SocietyDocumentCoverProps & {
  children?: ReactNode;
  eyebrow: string;
  icon: string;
  summary: string;
  title: string;
};

type SocietyDocumentToolbarProps = {
  actions?: ReactNode;
  children?: ReactNode;
  label: ReactNode;
  status?: ReactNode;
};

export function SocietyDocumentCover({ bannerPage, canEdit, imageUrl, label, positionY = 50, tone }: SocietyDocumentCoverProps) {
  return (
    <div
      className={styles.societyDocumentCover}
      data-has-image={imageUrl ? "true" : "false"}
      data-tone={tone}
      style={imageUrl ? { backgroundImage: `linear-gradient(rgba(8,12,13,.2), rgba(8,12,13,.42)), url(${imageUrl})`, backgroundPosition: `center ${positionY}%` } : undefined}
    >
      <div aria-hidden="true" className={styles.coverArtwork}><span /><span /><span /></div>
      <span className={styles.documentCoverLabel}>{label}</span>
      <span className={styles.documentCoverMark}>HYPED / EDI</span>
      {canEdit && bannerPage && <BannerEditor hasImage={Boolean(imageUrl)} page={bannerPage} positionY={positionY} />}
    </div>
  );
}

export function SocietyDocumentHeader({
  children,
  bannerPage,
  canEdit,
  eyebrow,
  icon,
  imageUrl,
  label,
  positionY,
  summary,
  title,
  tone,
}: SocietyDocumentHeaderProps) {
  return (
    <header className={styles.societyDocumentHeader}>
      <SocietyDocumentCover bannerPage={bannerPage} canEdit={canEdit} imageUrl={imageUrl} label={label} positionY={positionY} tone={tone} />
      <div className={styles.societyDocumentIdentity}>
        <div className={styles.societyDocumentIcon}>{icon}</div>
        <span className={styles.societyDocumentEyebrow}>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{summary}</p>
        {children}
      </div>
    </header>
  );
}

export function SocietyDocumentToolbar({
  actions,
  children,
  label,
  status,
}: SocietyDocumentToolbarProps) {
  return (
    <div className={styles.societyDocumentToolbar}>
      <div className={styles.societyDocumentTrail}>
        <span>{label}</span>
        {status}
        {children}
      </div>
      {actions && <div className={styles.societyDocumentActions}>{actions}</div>}
    </div>
  );
}
