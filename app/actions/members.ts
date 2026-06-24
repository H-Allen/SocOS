"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { adminDb } from "@/lib/firebase/admin";
import { getServerFirebaseUser } from "@/lib/firebase/session";
import type { MembershipRole, PermissionLevel } from "@/types";

const roleSchema = z.enum(["president", "secretary", "treasurer", "committee", "member"]);
const emailSchema = z.string().email();

function nowIso() {
  return new Date().toISOString();
}

function permissionForRole(role: MembershipRole): PermissionLevel {
  if (role === "president") return "admin";
  return role === "member" ? "member" : "committee";
}

async function requireAdmin(organizationId: string) {
  const user = await getServerFirebaseUser();

  if (!user) {
    return { user: null, error: "Unauthenticated." };
  }

  const membership = await adminDb.collection("memberships").doc(`${organizationId}_${user.uid}`).get();

  if (!membership.exists || membership.data()?.permission_level !== "admin") {
    return { user: null, error: "You do not have permission to manage members." };
  }

  return { user, error: null };
}

async function countAdmins(organizationId: string) {
  const admins = await adminDb
    .collection("memberships")
    .where("organization_id", "==", organizationId)
    .where("permission_level", "==", "admin")
    .get();

  return admins.size;
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

  if (current?.permission_level === "admin" && nextPermission !== "admin" && (await countAdmins(input.organizationId)) <= 1) {
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

  if (current?.permission_level === "admin" && (await countAdmins(input.organizationId)) <= 1) {
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
