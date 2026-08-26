"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { PublicProfileView } from "@/domain/public-profiles";
import type { TeamView } from "@/domain/teams";

import { SocietyDocumentHeader, SocietyDocumentToolbar } from "./society-document";
import styles from "./society.module.css";

type TeamsPageProps = {
  bannerImageUrl?: string | null;
  bannerPosition?: number;
  canEdit?: boolean;
  initialTeamId?: string;
  teams: TeamView[];
  people: PublicProfileView[];
};

export function TeamsPage({ bannerImageUrl, bannerPosition, canEdit, initialTeamId, people, teams }: TeamsPageProps) {
  const [selectedId, setSelectedId] = useState(
    initialTeamId && teams.some((team) => team.id === initialTeamId) ? initialTeamId : teams[0]?.id ?? null,
  );
  const selected = teams.find((team) => team.id === selectedId) ?? teams[0] ?? null;
  const personById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);

  function openTeam(teamId: string) {
    setSelectedId(teamId);
    const url = new URL(window.location.href);
    url.searchParams.set("team", teamId);
    window.history.replaceState(window.history.state, "", url);
    window.setTimeout(() => document.getElementById("team-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  return (
    <div className={styles.teamsPage}>
      <SocietyDocumentToolbar actions={<Link href="/people">People</Link>} label="Teams" status={<small>{teams.length} connected</small>} />
      <SocietyDocumentHeader
        bannerPage="teams"
        canEdit={canEdit}
        imageUrl={bannerImageUrl}
        positionY={bannerPosition}
        eyebrow="How the society fits together"
        icon="🧩"
        label="THE WHOLE SOCIETY / ONE SYSTEM"
        summary="See what each part of HYPED owns, who leads it and where the handoffs happen."
        title="Teams"
        tone="teams"
      >
        <div className={styles.sharedGoalCard}><small>Shared result</small><strong>European Hyperloop Week</strong><span>Every team shown below contributes to the same pod.</span></div>
      </SocietyDocumentHeader>

      <section aria-label="HYPED team map" className={styles.teamMap}>
        <div className={styles.teamMapRail}><span>MEMBERS</span><b>→</b><span>TEAMS</span><b>→</b><span>ONE POD</span></div>
        <div className={styles.teamMapGrid}>
          {teams.map((team) => {
            const lead = team.leadUserId ? personById.get(team.leadUserId) : null;
            return (
              <button className={team.id === selected?.id ? styles.teamCardActive : undefined} key={team.id} onClick={() => openTeam(team.id)} type="button">
                <span className={styles.teamCardTop}><b>{team.icon}</b><i>{String(team.order + 1).padStart(2, "0")}</i></span>
                <strong>{team.name}</strong><p>{team.summary}</p>
                <span className={styles.teamCardMeta}>{lead ? `Led by ${lead.displayName}` : "Lead to be named"}<b>{team.connections.length} links</b></span>
              </button>
            );
          })}
        </div>
      </section>

      {selected && (
        <section className={styles.teamDetail} id="team-detail">
          <div className={styles.teamDetailHeading}><div className={styles.teamDetailIcon}>{selected.icon}</div><div><small>TEAM {String(selected.order + 1).padStart(2, "0")}</small><h2>{selected.name}</h2><p>{selected.summary}</p></div></div>
          <div className={styles.teamDetailGrid}>
            <div className={styles.teamPurposeBlock}><span>WHY IT EXISTS</span><p>{selected.purpose}</p><div className={styles.teamFocusNote}><small>RIGHT NOW</small><strong>{selected.currentFocus}</strong></div></div>
            <div className={styles.teamOwnsBlock}><span>THIS TEAM OWNS</span><ul>{selected.owns.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </div>
          <div className={styles.teamPeopleRow}>
            <div>
              <span>TEAM LEAD</span>
              {selected.leadUserId && personById.get(selected.leadUserId) ? (
                <Link href={`/people?member=${encodeURIComponent(selected.leadUserId)}`}><b>{initials(personById.get(selected.leadUserId)?.displayName ?? "")}</b><span><strong>{personById.get(selected.leadUserId)?.displayName}</strong><small>Open profile →</small></span></Link>
              ) : <p>Committee still needs to name a lead.</p>}
            </div>
            <div>
              <span>TEAM KNOWLEDGE</span>
              {selected.wikiPageId ? <Link className={styles.teamWikiLink} href={`/wiki?page=${encodeURIComponent(selected.wikiPageId)}`}>Open the {selected.name} handbook <b>→</b></Link> : <p>No handbook linked yet.</p>}
            </div>
          </div>
          <div className={styles.handoffsSection}>
            <header><span>HANDOFFS / DEPENDENCIES</span><p>How this team’s work becomes useful to somebody else.</p></header>
            <div>
              {selected.connections.map((connection) => {
                const connected = teams.find((team) => team.id === connection.teamId);
                return connected ? <button key={connection.teamId} onClick={() => openTeam(connection.teamId)} type="button"><span>{selected.icon}</span><b>↔</b><span>{connected.icon}</span><strong>{connected.name}</strong><p>{connection.reason}</p><i>Open team →</i></button> : null;
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}
