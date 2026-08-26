import { ExternalIcon, MegaphoneIcon } from "@/components/icons";
import type { HomepageBlock, HomepageContent } from "@/domain/homepage";

import { BannerEditor } from "./banner-editor";
import styles from "./society.module.css";

export function HomePage({ bannerImagePath, bannerPosition = 50, canEdit, content }: { bannerImagePath?: string | null; bannerPosition?: number; canEdit?: boolean; content: HomepageContent }) {
  const coverImage = mediaUrl(bannerImagePath ?? null);

  return (
    <div className={styles.homePage}>
      <section
        className={`${styles.cover} ${styles.coverpurple}`}
        data-has-image={coverImage ? "true" : "false"}
        style={coverImage ? { backgroundImage: `linear-gradient(rgba(17,35,48,.15), rgba(17,35,48,.28)), url(${coverImage})`, backgroundPosition: `center ${bannerPosition}%` } : undefined}
      >
        <div aria-hidden="true" className={styles.coverArtwork}><span /><span /><span /></div>
        {canEdit && <BannerEditor hasImage={Boolean(coverImage)} page="home" positionY={bannerPosition} />}
      </section>

      <div className={styles.pageContent}>
        <div className={styles.pageIdentity}>
          <div className={styles.pageIcon}>{content.icon}</div>
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
          {content.sections.map((section) => (
            <section className={styles.pageBlock} key={section.id}>
              {section.layout === "split"
                ? <SplitSection blocks={section.blocks} />
                : <Block block={section.blocks[0]} />}
            </section>
          ))}
        </div>

      </div>
    </div>
  );
}

function SplitSection({ blocks }: { blocks: HomepageBlock[] }) {
  const events = blocks.find((block) => block.kind === "events");
  const callout = blocks.find((block) => block.kind === "callout");
  if (!events || events.kind !== "events" || !callout || callout.kind !== "callout") return null;

  return (
    <div className={styles.columnsBlock}>
      <div>
        <div className={styles.blockHeading}><h2>{events.heading}</h2></div>
        <div className={styles.eventList}>
          {events.events.map((event) => (
            <div key={event.id}>
              <span><b>{event.day}</b> {event.month}</span>
              <p><strong>{event.title}</strong><small>{event.detail}</small></p>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.startCard}>
        <span className={styles.startCardIcon}>👋</span>
        <small>{callout.label}</small>
        <h2>{callout.heading}</h2>
        <p>{callout.body}</p>
        <a href={callout.action.href} {...externalLinkProps(callout.action.href)}>{callout.action.label} →</a>
      </div>
    </div>
  );
}

function Block({ block }: { block: HomepageBlock }) {
  if (block.kind === "text") {
    return <div className={styles.introBlock}><h2>{block.heading}</h2><p>{block.body}</p></div>;
  }

  if (block.kind === "announcement") {
    return (
      <div className={styles.announcementBlock}>
        <div className={styles.announcementIcon}><MegaphoneIcon /></div>
        <div><small>{block.label}</small><h3>{block.heading}</h3><p>{block.body}</p></div>
        {block.action && <a href={block.action.href} {...externalLinkProps(block.action.href)}>{block.action.label}</a>}
      </div>
    );
  }

  if (block.kind === "gallery") {
    return (
      <div className={styles.galleryBlock}>
        <div className={styles.blockHeading}>
          <div><small>{block.label}</small><h2>{block.heading}</h2></div>
          {block.action && <a href={block.action.href} {...externalLinkProps(block.action.href)}>{block.action.label}</a>}
        </div>
        <div className={styles.galleryGrid}>
          {block.items.map((item) => {
            const image = mediaUrl(item.imagePath);
            const placeholderClass = `gallery${item.placeholder[0].toUpperCase()}${item.placeholder.slice(1)}`;
            return (
              <article className={styles[placeholderClass]} key={item.id}>
                <div className={styles.mockPhoto} data-has-image={image ? "true" : "false"} style={image ? { backgroundImage: `url(${image})` } : undefined}>
                  {item.placeholder === "workshop" && !image && <span>HYPED</span>}
                  {!image && Array.from({ length: item.placeholder === "team" ? 4 : 3 }).map((_, index) => <i key={index} />)}
                </div>
                <p><strong>{item.title}</strong><small>{item.detail}</small></p>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  if (block.kind === "links") {
    return (
      <div className={styles.linksBlock}>
        <div className={styles.blockHeading}><div><small>{block.label}</small><h2>{block.heading}</h2></div></div>
        <div className={styles.linkCards}>
          {block.links.map((link) => (
            <a href={link.href} key={link.id} {...externalLinkProps(link.href)}>
              <span>↗</span><strong>{link.label}</strong>
              <small>{link.href.startsWith("https://") ? new URL(link.href).hostname : "Open in HYPED"}</small>
            </a>
          ))}
        </div>
      </div>
    );
  }

  if (block.kind === "people") {
    return (
      <div className={styles.peopleBlock}>
        <div className={styles.blockHeading}><div><small>{block.label}</small><h2>{block.heading}</h2></div></div>
        <div className={styles.spotlightGrid}>
          {block.people.map((person) => {
            const card = <article className={styles.spotlightCard}><span className={styles.spotlightInitials}>{person.initials}</span><div><strong>{person.name}</strong><span>{person.role}</span><small>{person.team}</small></div></article>;
            return person.href
              ? <a className={styles.spotlightCardLink} href={person.href} key={person.id} {...externalLinkProps(person.href)}>{card}</a>
              : <div className={styles.spotlightCardShell} key={person.id}>{card}</div>;
          })}
        </div>
      </div>
    );
  }

  return null;
}

function mediaUrl(path: string | null) {
  return path && !path.startsWith("demo:") ? `/api/media?path=${encodeURIComponent(path)}` : null;
}

function externalLinkProps(href: string) {
  return href.startsWith("https://") ? { rel: "noreferrer", target: "_blank" as const } : {};
}
