"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { PublicProfileView } from "@/domain/public-profiles";

import { SocietyDocumentHeader, SocietyDocumentToolbar } from "./society-document";
import styles from "./society.module.css";

type ProfileFilter = "everyone" | "committee" | "leads";

export function PublicPeoplePage({ bannerImageUrl, bannerPosition, canEdit, initialProfileId, profiles }: { bannerImageUrl?: string | null; bannerPosition?: number; canEdit?: boolean; initialProfileId?: string; profiles: PublicProfileView[] }) {
  const [filter, setFilter] = useState<ProfileFilter>("everyone");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialProfileId && profiles.some((profile) => profile.id === initialProfileId) ? initialProfileId : null,
  );
  const selected = profiles.find((profile) => profile.id === selectedId) ?? null;
  const teamCount = new Set(profiles.flatMap((profile) => profile.teamIds)).size;
  const expertiseCount = new Set(profiles.flatMap((profile) => profile.expertise)).size;

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return profiles.filter((profile) => {
      if (filter === "committee" && !["owner", "admin"].includes(profile.role)) return false;
      if (filter === "leads" && profile.role !== "teamLead") return false;
      if (!query) return true;
      return [profile.displayName, profile.roleTitle, profile.bio, ...profile.teamIds, ...profile.expertise, ...profile.responsibilities]
        .join(" ").toLocaleLowerCase().includes(query);
    });
  }, [filter, profiles, search]);

  const filters: Array<{ count: number; id: ProfileFilter; label: string }> = [
    { count: profiles.length, id: "everyone", label: "Everyone" },
    { count: profiles.filter((profile) => ["owner", "admin"].includes(profile.role)).length, id: "committee", label: "Committee" },
    { count: profiles.filter((profile) => profile.role === "teamLead").length, id: "leads", label: "Team leads" },
  ];

  function openProfile(profileId: string) {
    setSelectedId(profileId);
    const url = new URL(window.location.href);
    url.searchParams.set("member", profileId);
    window.history.replaceState(window.history.state, "", url);
  }

  function closeProfile() {
    setSelectedId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("member");
    window.history.replaceState(window.history.state, "", url);
  }

  return (
    <div className={styles.peoplePage}>
      <SocietyDocumentToolbar label="People" status={<small>{profiles.length} profiles</small>} />
      <SocietyDocumentHeader bannerPage="people" canEdit={canEdit} eyebrow="Society directory" icon="👥" imageUrl={bannerImageUrl} label="WHO KNOWS WHAT / WHO TO ASK" positionY={bannerPosition} summary="Find who knows what, what each team owns and who to ask." title="People" tone="people">
        <div aria-label="Directory summary" className={styles.peopleStats}><span><b>{profiles.length}</b>profiles</span><span><b>{teamCount}</b>teams</span><span><b>{expertiseCount}</b>skills</span></div>
      </SocietyDocumentHeader>

      <div className={styles.peopleDocumentContent}>
        <div className={styles.peopleFilters}>
          {filters.map((item) => <button className={filter === item.id ? styles.filterActive : undefined} key={item.id} onClick={() => setFilter(item.id)} type="button">{item.label} <span>{item.count}</span></button>)}
          <input aria-label="Find a person" onChange={(event) => setSearch(event.target.value)} placeholder="Name, team or skill…" type="search" value={search} />
        </div>

        <section className={styles.directorySection}>
          <div className={styles.directoryHeading}><h2>{filter === "everyone" ? "The society" : filters.find((item) => item.id === filter)?.label}</h2><small>{filtered.length} {filtered.length === 1 ? "person" : "people"}</small></div>
          {filtered.length ? (
            <div className={styles.peopleGrid}>
              {filtered.map((profile) => (
                <button className={styles.personCard} data-status="active" key={profile.id} onClick={() => openProfile(profile.id)} type="button">
                  <ProfileAvatar profile={profile} />
                  <span className={styles.personCardBody}><span className={styles.personNameRow}><strong>{profile.displayName}</strong></span><span>{profile.roleTitle}</span><small>{profile.teamIds.length ? profile.teamIds.join(" · ") : "No team listed yet"}</small></span>
                  <b aria-hidden="true">→</b>
                </button>
              ))}
            </div>
          ) : <div className={styles.peopleEmpty}><span>⌕</span><strong>{search ? "No one matches that" : "Profiles are being prepared"}</strong><p>{search ? "Try another name, team or skill." : "The committee will add people here soon."}</p></div>}
        </section>
        <section className={styles.ownershipSection}><h2>Not sure who owns something?</h2><p>The directory tells you who to ask. The technical Wiki tells you what HYPED already knows.</p><Link href="/wiki">Browse the technical Wiki →</Link></section>
      </div>

      {selected && (
        <div className={styles.personPanelLayer}>
          <button aria-label="Close public profile" className={styles.personPanelBackdrop} onClick={closeProfile} type="button" />
          <aside aria-label={`${selected.displayName} profile`} aria-modal="true" className={styles.personPanel} role="dialog">
            <header><span>People / Profile</span><button aria-label="Close profile" onClick={closeProfile} type="button">×</button></header>
            <div className={styles.personProfile}>
              <ProfileAvatar large profile={selected} /><small>{selected.roleTitle}</small><h2>{selected.displayName}</h2>
              <p className={styles.personBio}>{selected.bio || "This person has not written an introduction yet."}</p>
              <ProfileList empty="No team listed yet" hrefForValue={(value) => `/teams?team=${encodeURIComponent(teamId(value))}`} label="Teams" values={selected.teamIds} />
              <ProfileList empty="No responsibilities listed yet" label="Owns" values={selected.responsibilities} />
              <ProfileList empty="No skills listed yet" label="Can help with" values={selected.expertise} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function ProfileAvatar({ large = false, profile }: { large?: boolean; profile: PublicProfileView }) {
  return profile.photoURL
    // eslint-disable-next-line @next/next/no-img-element
    ? <img alt="" className={`${styles.personAvatar} ${large ? styles.personAvatarLarge : ""}`} src={profile.photoURL} />
    : <span className={`${styles.personAvatar} ${large ? styles.personAvatarLarge : ""}`} style={{ background: avatarColour(profile.id) }}>{initials(profile.displayName)}</span>;
}

function ProfileList({ empty, hrefForValue, label, values }: { empty: string; hrefForValue?: (value: string) => string; label: string; values: string[] }) {
  return <section className={styles.personProfileList}><h3>{label}</h3>{values.length ? <div>{values.map((value) => hrefForValue ? <Link href={hrefForValue(value)} key={value}>{value}</Link> : <span key={value}>{value}</span>)}</div> : <p>{empty}</p>}</section>;
}

function teamId(value: string) { return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join(""); }
function avatarColour(value: string) {
  const colours = ["#7a5af8", "#1570ef", "#d92d20", "#039855", "#dc6803", "#0e9384", "#c11574"];
  return colours[[...value].reduce((sum, character) => sum + character.charCodeAt(0), 0) % colours.length];
}
