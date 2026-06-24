"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { adminDb } from "@/lib/firebase/admin";
import { getServerFirebaseUser } from "@/lib/firebase/session";
import { ACTIVE_ORG_COOKIE } from "@/lib/org-state";
import type { MembershipRole, PermissionLevel } from "@/types";
import { permissionForRole } from "@/lib/workspace";

const roleSchema = z.enum(["president", "secretary", "treasurer", "committee", "member"]);
const emailSchema = z.string().email();

function nowIso() {
  return new Date().toISOString();
}

function hasAdminPower(membership: FirebaseFirestore.DocumentData | undefined) {
  if (!membership) return false;
  return membership.permission_level === "admin" || permissionForRole(membership.role as MembershipRole) === "admin";
}

function effectivePermission(membership: FirebaseFirestore.DocumentData | undefined): PermissionLevel {
  if (!membership) return "member";
  const rolePermission = permissionForRole(membership.role as MembershipRole);
  return rolePermission === "admin" ? "admin" : (membership.permission_level as PermissionLevel) ?? rolePermission;
}

function canManageTeams(membership: FirebaseFirestore.DocumentData | undefined) {
  const permission = effectivePermission(membership);
  return permission === "admin" || permission === "committee";
}

async function requireAdmin(organizationId: string) {
  const user = await getServerFirebaseUser();

  if (!user) {
    return { user: null, error: "Unauthenticated." };
  }

  const membership = await adminDb.collection("memberships").doc(`${organizationId}_${user.uid}`).get();

  if (!membership.exists || !hasAdminPower(membership.data())) {
    return { user: null, error: "You do not have permission to manage members." };
  }

  return { user, error: null };
}

async function requireTeamManager(organizationId: string) {
  const user = await getServerFirebaseUser();

  if (!user) {
    return { user: null, membership: null, error: "Unauthenticated." };
  }

  const membership = await adminDb.collection("memberships").doc(`${organizationId}_${user.uid}`).get();

  if (!membership.exists || !canManageTeams(membership.data())) {
    return { user: null, membership: null, error: "You do not have permission to manage teams." };
  }

  return { user, membership: membership.data() ?? null, error: null };
}

async function countAdmins(organizationId: string) {
  const memberships = await adminDb
    .collection("memberships")
    .where("organization_id", "==", organizationId)
    .get();

  return memberships.docs.filter((membership) => hasAdminPower(membership.data())).length;
}

export async function inviteMember(input: {
  organizationId: string;
  email: string;
  role: MembershipRole;
}): Promise<{ error: string | null }> {
  const auth = await requireAdmin(input.organizationId);

  if (auth.error || !auth.user) {
    return { error: auth.error };
  }

  const parsedEmail = emailSchema.safeParse(input.email.trim().toLowerCase());
  const parsedRole = roleSchema.safeParse(input.role);

  if (!parsedEmail.success || !parsedRole.success) {
    return { error: "Enter a valid email and role." };
  }

  const email = parsedEmail.data;
  const role = parsedRole.data;
  const existingInvite = await adminDb
    .collection("invites")
    .where("organization_id", "==", input.organizationId)
    .where("email", "==", email)
    .where("status", "==", "pending")
    .limit(1)
    .get();

  if (!existingInvite.empty) {
    return { error: "That person already has a pending invite." };
  }

  const now = nowIso();
  const inviteRef = adminDb.collection("invites").doc();
  const activityRef = adminDb.collection("activity_logs").doc();
  const batch = adminDb.batch();

  batch.set(inviteRef, {
    id: inviteRef.id,
    organization_id: input.organizationId,
    email,
    role,
    permission_level: permissionForRole(role),
    invited_by: auth.user.uid,
    status: "pending",
    created_at: now
  });

  batch.set(activityRef, {
    id: activityRef.id,
    organization_id: input.organizationId,
    actor_user_id: auth.user.uid,
    action: "invited a member",
    metadata: {
      invite_email: email,
      invite_role: role
    },
    created_at: now
  });

  await batch.commit();
  revalidatePath("/members");

  return { error: null };
}

export async function updateMemberRole(input: {
  organizationId: string;
  membershipId: string;
  role: MembershipRole;
}): Promise<{ error: string | null }> {
  const auth = await requireAdmin(input.organizationId);

  if (auth.error || !auth.user) {
    return { error: auth.error };
  }

  const parsedRole = roleSchema.safeParse(input.role);

  if (!parsedRole.success) {
    return { error: "Invalid role." };
  }

  const membershipRef = adminDb.collection("memberships").doc(input.membershipId);
  const membership = await membershipRef.get();

  if (!membership.exists || membership.data()?.organization_id !== input.organizationId) {
    return { error: "Member not found." };
  }

  const current = membership.data();
  const nextRole = parsedRole.data;
  const nextPermission = permissionForRole(nextRole);

  if (hasAdminPower(current) && nextPermission !== "admin" && (await countAdmins(input.organizationId)) <= 1) {
    return { error: "You cannot demote the final admin." };
  }

  const now = nowIso();
  const activityRef = adminDb.collection("activity_logs").doc();
  const batch = adminDb.batch();

  batch.update(membershipRef, {
    role: nextRole,
    permission_level: nextPermission
  });

  batch.set(activityRef, {
    id: activityRef.id,
    organization_id: input.organizationId,
    actor_user_id: auth.user.uid,
    action: "changed member role",
    metadata: {
      member_user_id: current?.user_id,
      from_role: current?.role,
      to_role: nextRole
    },
    created_at: now
  });

  await batch.commit();
  revalidatePath("/members");

  return { error: null };
}

export async function updateMemberTeam(input: {
  organizationId: string;
  membershipId: string;
  teamId: string | null;
}): Promise<{ error: string | null }> {
  const auth = await requireTeamManager(input.organizationId);

  if (auth.error || !auth.user || !auth.membership) {
    return { error: auth.error };
  }

  const membershipRef = adminDb.collection("memberships").doc(input.membershipId);
  const membership = await membershipRef.get();

  if (!membership.exists || membership.data()?.organization_id !== input.organizationId) {
    return { error: "Member not found." };
  }

  const current = membership.data();
  const managerPermission = effectivePermission(auth.membership);
  let teamId = input.teamId || null;
  let teamLeadUserId: string | null = null;

  if (teamId) {
    const team = await adminDb.collection("teams").doc(teamId).get();
    const teamData = team.data();

    if (!team.exists || teamData?.organization_id !== input.organizationId) {
      return { error: "Choose a valid team." };
    }

    if (managerPermission !== "admin" && teamData.lead_user_id !== auth.user.uid) {
      return { error: "Committee members can only manage their own teams." };
    }

    if (managerPermission !== "admin" && permissionForRole(current?.role as MembershipRole) !== "member") {
      return { error: "Committee members can only assign general members to their teams." };
    }

    teamLeadUserId = teamData.lead_user_id ?? null;
  }

  const now = nowIso();
  const activityRef = adminDb.collection("activity_logs").doc();
  const batch = adminDb.batch();

  batch.update(membershipRef, { team_id: teamId, team_lead_user_id: teamLeadUserId });
  batch.set(activityRef, {
    id: activityRef.id,
    organization_id: input.organizationId,
    actor_user_id: auth.user.uid,
    action: teamLeadUserId ? "assigned member to a team" : "removed member from a team",
    metadata: {
      member_user_id: current?.user_id,
      team_id: teamId,
      team_lead_user_id: teamLeadUserId
    },
    created_at: now
  });

  await batch.commit();
  revalidatePath("/members");
  revalidatePath("/tasks");

  return { error: null };
}

export async function createTeam(input: {
  organizationId: string;
  name: string;
}): Promise<{ team: { id: string; organization_id: string; name: string; lead_user_id: string; created_by: string; created_at: string } | null; error: string | null }> {
  const auth = await requireTeamManager(input.organizationId);

  if (auth.error || !auth.user) {
    return { team: null, error: auth.error };
  }

  const name = input.name.trim();

  if (name.length < 2) {
    return { team: null, error: "Team name must be at least 2 characters." };
  }

  const duplicate = await adminDb
    .collection("teams")
    .where("organization_id", "==", input.organizationId)
    .where("name", "==", name)
    .limit(1)
    .get();

  if (!duplicate.empty) {
    return { team: null, error: "A team with that name already exists." };
  }

  const now = nowIso();
  const teamRef = adminDb.collection("teams").doc();
  const activityRef = adminDb.collection("activity_logs").doc();
  const team = {
    id: teamRef.id,
    organization_id: input.organizationId,
    name,
    lead_user_id: auth.user.uid,
    created_by: auth.user.uid,
    created_at: now
  };
  const batch = adminDb.batch();

  batch.set(teamRef, team);
  batch.set(activityRef, {
    id: activityRef.id,
    organization_id: input.organizationId,
    actor_user_id: auth.user.uid,
    action: "created a team",
    metadata: { team_id: teamRef.id, team_name: name },
    created_at: now
  });

  await batch.commit();
  revalidatePath("/members");
  revalidatePath("/tasks");

  return { team, error: null };
}

export async function removeMember(input: {
  organizationId: string;
  membershipId: string;
}): Promise<{ error: string | null }> {
  const auth = await requireAdmin(input.organizationId);

  if (auth.error || !auth.user) {
    return { error: auth.error };
  }

  const membershipRef = adminDb.collection("memberships").doc(input.membershipId);
  const membership = await membershipRef.get();

  if (!membership.exists || membership.data()?.organization_id !== input.organizationId) {
    return { error: "Member not found." };
  }

  const current = membership.data();

  if (current?.user_id === auth.user.uid) {
    return { error: "You cannot remove your own account from here." };
  }

  if (hasAdminPower(current) && (await countAdmins(input.organizationId)) <= 1) {
    return { error: "You cannot remove the final admin." };
  }

  const now = nowIso();
  const activityRef = adminDb.collection("activity_logs").doc();
  const batch = adminDb.batch();

  batch.delete(membershipRef);
  batch.set(activityRef, {
    id: activityRef.id,
    organization_id: input.organizationId,
    actor_user_id: auth.user.uid,
    action: "removed a member",
    metadata: {
      member_user_id: current?.user_id,
      role: current?.role
    },
    created_at: now
  });

  await batch.commit();
  revalidatePath("/members");

  return { error: null };
}

export async function leaveOrganization(input: {
  organizationId: string;
}): Promise<{ error: string | null }> {
  const user = await getServerFirebaseUser();

  if (!user) {
    return { error: "Unauthenticated." };
  }

  const membershipRef = adminDb.collection("memberships").doc(`${input.organizationId}_${user.uid}`);
  const membership = await membershipRef.get();

  if (!membership.exists || membership.data()?.organization_id !== input.organizationId) {
    return { error: "You are not a member of this society." };
  }

  const current = membership.data();

  if (hasAdminPower(current) && (await countAdmins(input.organizationId)) <= 1) {
    return { error: "You are the final admin. Assign another President, Secretary, or Treasurer before leaving." };
  }

  const now = nowIso();
  const activityRef = adminDb.collection("activity_logs").doc();
  const batch = adminDb.batch();

  batch.delete(membershipRef);
  batch.set(activityRef, {
    id: activityRef.id,
    organization_id: input.organizationId,
    actor_user_id: user.uid,
    action: "left the society",
    metadata: {
      member_user_id: user.uid,
      role: current?.role
    },
    created_at: now
  });

  await batch.commit();
  const cookieStore = cookies();

  if (cookieStore.get(ACTIVE_ORG_COOKIE)?.value === input.organizationId) {
    cookieStore.delete(ACTIVE_ORG_COOKIE);
  }

  revalidatePath("/members");
  revalidatePath("/dashboard");

  return { error: null };
}
