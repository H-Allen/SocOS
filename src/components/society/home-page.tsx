import { ExternalIcon } from "@/components/icons";
import type { HomepageContent, HomepageSection } from "@/domain/homepage";

import { BannerEditor } from "./banner-editor";
import styles from "./society.module.css";

type HomePageProps = {
  bannerImagePath?: string | null;
  bannerPosition?: number;
  canEdit?: boolean;
  content: HomepageContent;
};

export function HomePage({ bannerImagePath, bannerPosition = 50, canEdit, content }: HomePageProps) {
  const coverImage = bannerImagePath ? `/api/media?path=${encodeURIComponent(bannerImagePath)}` : null;

  return (
    <div>
      <section
        className={styles.cover}
        data-has-image={coverImage ? "true" : "false"}
        style={coverImage ? {
          backgroundImage: `linear-gradient(rgba(17,35,48,.15), rgba(17,35,48,.28)), url(${coverImage})`,
          backgroundPosition: `center ${bannerPosition}%`,
        } : undefined}
      >
        {canEdit && <BannerEditor hasImage={Boolean(coverImage)} page="home" positionY={bannerPosition} />}
      </section>

      <div className={styles.pageContent}>
        <div className={styles.pageIdentity}>
          <h1>{content.title}</h1>
          <p>{content.tagline}</p>
        </div>

        <div className={styles.quickLinks}>
          {content.quickLinks.map((link) => (
            <a href={link.href} key={`${link.label}-${link.href}`} {...externalLinkProps(link.href)}>
              {link.label} {link.href.startsWith("https://") ? <ExternalIcon /> : "→"}
            </a>
          ))}
        </div>

        <div className={styles.blocks}>
          {content.sections.map((section) => <HomepageSectionView key={section.id} section={section} />)}
        </div>
      </div>
    </div>
  );
}

function HomepageSectionView({ section }: { section: HomepageSection }) {
  if (section.kind === "text") {
    return <section className={`${styles.pageBlock} ${styles.introBlock}`}><h2>{section.heading}</h2><p>{section.body}</p></section>;
  }

  return (
    <section className={styles.pageBlock}>
      <div className={styles.blockHeading}><div><small>{section.label}</small><h2>{section.heading}</h2></div></div>
      <div className={styles.linkCards}>
        {section.links.map((link) => (
          <a href={link.href} key={link.id} {...externalLinkProps(link.href)}>
            <span>{link.href.startsWith("https://") ? <ExternalIcon /> : "→"}</span>
            <strong>{link.label}</strong>
            <small>{link.href.startsWith("https://") ? new URL(link.href).hostname : "This site"}</small>
          </a>
        ))}
      </div>
    </section>
  );
}

function externalLinkProps(href: string) {
  return href.startsWith("https://") ? { rel: "noreferrer", target: "_blank" as const } : {};
}
