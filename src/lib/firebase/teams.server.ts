import "server-only";

import { z } from "zod";

import { HYPED_SOCIETY_ID } from "@/domain/hyped";
import { teamContentSchema, type TeamView } from "@/domain/teams";
import { getAdminFirestore } from "@/lib/firebase/admin";

const storedTeamSchema = teamContentSchema.extend({
  revision: z.number().int().min(1),
  updatedBy: z.string().min(1),
});

export async function listTeams(): Promise<TeamView[]> {
  try {
    const snapshot = await getAdminFirestore().collection(`societies/${HYPED_SOCIETY_ID}/teams`).get();
    return snapshot.docs
      .flatMap((document) => {
        const team = toView(document.id, document.data());
        return team ? [team] : [];
      })
      .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));
  } catch {
    return [];
  }
}

function toView(id: string, raw: unknown): TeamView | null {
  const result = storedTeamSchema.safeParse(raw);
  if (!result.success) return null;
  const team = result.data;
  return {
    connections: team.connections,
    currentFocus: team.currentFocus,
    icon: team.icon,
    id,
    leadUserId: team.leadUserId,
    name: team.name,
    order: team.order,
    owns: team.owns,
    purpose: team.purpose,
    summary: team.summary,
    wikiPageId: team.wikiPageId,
  };
}
