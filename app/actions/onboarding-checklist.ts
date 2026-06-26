"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { adminDb } from "@/lib/firebase/admin";
import { getServerFirebaseUser } from "@/lib/firebase/session";
import { permissionForRole } from "@/lib/workspace";
import type { MembershipRole, OnboardingItemRecord, OnboardingProgressRecord, PermissionLevel } from "@/types";

const itemSchema = z.object({
  organizationId: z.string().min(1),
  teamId: z.string().optional().nullable(),
  title: z.string().min(2),
  description: z.string().optional(),
  required: z.boolean().default(true),
  requiresApproval: z.boolean().default(true)
});

function nowIso() {
  return new Date().toISOString();
}

function effectivePermission(membership: FirebaseFirestore.DocumentData | undefined): PermissionLevel {
  if (!membership) return "member";
  const rolePermission = permissionForRole(membership.role as MembershipRole);
  return rolePermission === "admin" ? "admin" : (membership.permission_level as PermissionLevel) ?? rolePermission;
}

async function getMembership(organizationId: string, userId: string) {
  const snap = await adminDb.collection("memberships").doc(`${organizationId}_${userId}`).get();
  return snap.exists ? snap.data() : null;
}

async function requireMember(organizationId: string) {
  const user = await getServerFirebaseUser();

  if (!user) {
    return { user: null, membership: null, permission: "member" as PermissionLevel, error: "Unauthenticated." };
  }

  const membership = await getMembership(organizationId, user.uid);

  if (!membership) {
    return { user: null, membership: null, permission: "member" as PermissionLevel, error: "You are not a member of this society." };
  }

  return { user, membership, permission: effectivePermission(membership), error: null };
}

function canManageTemplate(permission: PermissionLevel) {
  return permission === "admin" || permission === "committee";
}

async function canManageTeamTemplate(organizationId: string, userId: string, teamId: string | null | undefined, permission: PermissionLevel) {
  if (!teamId || permission === "admin") return true;
  const team = await adminDb.collection("teams").doc(teamId).get();
  return team.exists && team.data()?.organization_id === organizationId && team.data()?.lead_user_id === userId;
}

async function canApproveForMember(organizationId: string, approverId: string, targetUserId: string, permission: PermissionLevel) {
  if (permission === "admin") return true;
  const targetMembership = await getMembership(organizationId, targetUserId);
  return permission === "committee" && targetMembership?.team_lead_user_id === approverId;
}

async function hydrateProgress(progressId: string): Promise<OnboardingProgressRecord | null> {
  const snap = await adminDb.collection("onboarding_progress").doc(progressId).get();
  if (!snap.exists) return null;
  const progress = { id: snap.id, ...snap.data() } as OnboardingProgressRecord;
  const approver = progress.approved_by ? await adminDb.collection("users").doc(progress.approved_by).get() : null;

  return {
    ...progress,
    approver: approver?.exists ? ({ id: approver.id, ...approver.data() } as OnboardingProgressRecord["approver"]) : null
  };
}

export async function createOnboardingItem(input: z.input<typeof itemSchema>): Promise<{ item: OnboardingItemRecord | null; error: string | null }> {
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return { item: null, error: "Add a clear onboarding item title." };

  const auth = await requireMember(parsed.data.organizationId);
  if (auth.error || !auth.user) return { item: null, error: auth.error };
  if (!canManageTemplate(auth.permission)) return { item: null, error: "You do not have permission to manage onboarding." };
  const teamId = parsed.data.teamId || null;
  if (!(await canManageTeamTemplate(parsed.data.organizationId, auth.user.uid, teamId, auth.permission))) {
    return { item: null, error: "You can only manage onboarding for teams you lead." };
  }

  const existing = await adminDb
    .collection("onboarding_items")
    .where("organization_id", "==", parsed.data.organizationId)
    .where("team_id", "==", teamId)
    .get();
  const now = nowIso();
  const ref = adminDb.collection("onboarding_items").doc();
  const item: OnboardingItemRecord = {
    id: ref.id,
    organization_id: parsed.data.organizationId,
    team_id: teamId,
    title: parsed.data.title.trim(),
    description: parsed.data.description?.trim() || null,
    required: parsed.data.required,
    requires_approval: parsed.data.requiresApproval,
    position: existing.size,
    created_by: auth.user.uid,
    created_at: now
  };

  const activityRef = adminDb.collection("activity_logs").doc();
  const batch = adminDb.batch();
  batch.set(ref, item);
  batch.set(activityRef, {
    id: activityRef.id,
    organization_id: parsed.data.organizationId,
    actor_user_id: auth.user.uid,
    action: "created onboarding item",
    metadata: { onboarding_item_id: ref.id, title: item.title },
    created_at: now
  });

  await batch.commit();
  revalidatePath("/members");

  return { item, error: null };
}

export async function deleteOnboardingItem(input: { organizationId: string; itemId: string }): Promise<{ error: string | null }> {
  const auth = await requireMember(input.organizationId);
  if (auth.error || !auth.user) return { error: auth.error };
  if (!canManageTemplate(auth.permission)) return { error: "You do not have permission to manage onboarding." };

  const itemRef = adminDb.collection("onboarding_items").doc(input.itemId);
  const item = await itemRef.get();
  if (!item.exists || item.data()?.organization_id !== input.organizationId) return { error: "Onboarding item not found." };
  if (!(await canManageTeamTemplate(input.organizationId, auth.user.uid, item.data()?.team_id ?? null, auth.permission))) {
    return { error: "You can only manage onboarding for teams you lead." };
  }

  await itemRef.delete();
  revalidatePath("/members");
  return { error: null };
}

export async function submitOnboardingItem(input: {
  organizationId: string;
  userId: string;
  itemId: string;
}): Promise<{ progress: OnboardingProgressRecord | null; error: string | null }> {
  const auth = await requireMember(input.organizationId);
  if (auth.error || !auth.user) return { progress: null, error: auth.error };

  const canSubmitForTarget = auth.user.uid === input.userId || (await canApproveForMember(input.organizationId, auth.user.uid, input.userId, auth.permission));
  if (!canSubmitForTarget) return { progress: null, error: "You can only update your own onboarding." };

  const item = await adminDb.collection("onboarding_items").doc(input.itemId).get();
  if (!item.exists || item.data()?.organization_id !== input.organizationId) return { progress: null, error: "Onboarding item not found." };

  const itemData = item.data();
  const status = itemData?.requires_approval === false ? "approved" : "submitted";
  const now = nowIso();
  const progressId = `${input.organizationId}_${input.userId}_${input.itemId}`;
  const progressRef = adminDb.collection("onboarding_progress").doc(progressId);

  await progressRef.set(
    {
      id: progressId,
      organization_id: input.organizationId,
      user_id: input.userId,
      item_id: input.itemId,
      status,
      submitted_at: now,
      approved_at: status === "approved" ? now : null,
      approved_by: status === "approved" ? auth.user.uid : null,
      updated_at: now
    },
    { merge: true }
  );

  revalidatePath("/members");
  return { progress: await hydrateProgress(progressId), error: null };
}

export async function approveOnboardingItem(input: {
  organizationId: string;
  userId: string;
  itemId: string;
}): Promise<{ progress: OnboardingProgressRecord | null; error: string | null }> {
  const auth = await requireMember(input.organizationId);
  if (auth.error || !auth.user) return { progress: null, error: auth.error };

  if (!(await canApproveForMember(input.organizationId, auth.user.uid, input.userId, auth.permission))) {
    return { progress: null, error: "You can only approve onboarding for members you lead." };
  }

  const item = await adminDb.collection("onboarding_items").doc(input.itemId).get();
  if (!item.exists || item.data()?.organization_id !== input.organizationId) return { progress: null, error: "Onboarding item not found." };

  const now = nowIso();
  const progressId = `${input.organizationId}_${input.userId}_${input.itemId}`;
  await adminDb.collection("onboarding_progress").doc(progressId).set(
    {
      id: progressId,
      organization_id: input.organizationId,
      user_id: input.userId,
      item_id: input.itemId,
      status: "approved",
      submitted_at: now,
      approved_at: now,
      approved_by: auth.user.uid,
      updated_at: now
    },
    { merge: true }
  );

  revalidatePath("/members");
  return { progress: await hydrateProgress(progressId), error: null };
}
