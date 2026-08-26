import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

import { createDefaultTeams, teamContentSchema, type TeamView } from "@/domain/teams";
import { getAdminFirestore } from "@/lib/firebase/admin";

const storedTeamSchema = teamContentSchema.extend({
  revision: z.number().int().min(1),
  updatedBy: z.string().min(1),
});

export async function listTeams(societyId: string, societyName: string): Promise<TeamView[]> {
  let stored: TeamView[] = [];
  try {
    const snapshot = await getAdminFirestore().collection(`societies/${societyId}/teams`).get();
    stored = snapshot.docs.map((document) => toView(document.id, document.data()));
  } catch {
    // Built-in starter teams keep the public site useful without Firebase.
  }
  const storedById = new Map(stored.map((team) => [team.id, team]));
  const defaults = createDefaultTeams(societyName).map((team) => {
    const id = teamId(team.name);
    return storedById.get(id) ?? { ...team, id, revision: 0, updatedAt: null, updatedBy: null };
  });
  const defaultIds = new Set(defaults.map((team) => team.id));
  return [...defaults, ...stored.filter((team) => !defaultIds.has(team.id))]
    .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));
}

function toView(id: string, raw: unknown): TeamView {
  const parsed = storedTeamSchema.parse(raw);
  const updatedAt = (raw as { updatedAt?: unknown }).updatedAt;
  return { ...parsed, id, updatedAt: updatedAt instanceof Timestamp ? updatedAt.toDate().toISOString() : null };
}

function teamId(name: string) { return name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
