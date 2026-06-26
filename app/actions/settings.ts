"use server";

import { revalidatePath } from "next/cache";

import { adminDb } from "@/lib/firebase/admin";
import { getServerFirebaseUser } from "@/lib/firebase/session";
import { builtInNavItems, type BuiltInNavId, type CustomNavItem } from "@/lib/navigation";
import { permissionForRole } from "@/lib/workspace";
import type { MembershipRole } from "@/types";

function generateJoinCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

async function createUniqueJoinCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateJoinCode();
    const existing = await adminDb.collection("organizations").where("join_code", "==", code).limit(1).get();

    if (existing.empty) {
      return code;
    }
  }

  throw new Error("Could not generate a unique society code.");
}

export async function ensureOrganizationJoinCode(organizationId: string): Promise<{ code: string | null; error: string | null }> {
  const user = await getServerFirebaseUser();

  if (!user) {
    return { code: null, error: "Unauthenticated." };
  }

  const membership = await adminDb.collection("memberships").doc(`${organizationId}_${user.uid}`).get();

  const membershipData = membership.data();

  if (
    !membership.exists ||
    (membershipData?.permission_level !== "admin" && permissionForRole(membershipData?.role as MembershipRole) !== "admin")
  ) {
    return { code: null, error: "You do not have permission to manage society codes." };
  }

  const orgRef = adminDb.collection("organizations").doc(organizationId);
  const org = await orgRef.get();

  if (!org.exists) {
    return { code: null, error: "Organization not found." };
  }

  const existingCode = org.data()?.join_code;

  if (typeof existingCode === "string" && existingCode.length >= 6) {
    return { code: existingCode, error: null };
  }

  const code = await createUniqueJoinCode();
  await orgRef.set({ join_code: code }, { merge: true });
  revalidatePath("/settings");

  return { code, error: null };
}

async function requireAdmin(organizationId: string) {
  const user = await getServerFirebaseUser();

  if (!user) return { user: null, error: "Unauthenticated." };

  const membership = await adminDb.collection("memberships").doc(`${organizationId}_${user.uid}`).get();
  const membershipData = membership.data();

  if (!membership.exists || (membershipData?.permission_level !== "admin" && permissionForRole(membershipData?.role as MembershipRole) !== "admin")) {
    return { user: null, error: "You do not have permission to customize this society." };
  }

  return { user, error: null };
}

export async function updateNavigationConfig(input: {
  organizationId: string;
  visibleBuiltIns: BuiltInNavId[];
  customItems: CustomNavItem[];
}): Promise<{ error: string | null }> {
  const auth = await requireAdmin(input.organizationId);
  if (auth.error || !auth.user) return { error: auth.error };

  const allowedBuiltIns = new Set(builtInNavItems.map((item) => item.id));
  const visibleBuiltIns = input.visibleBuiltIns.filter((id) => allowedBuiltIns.has(id));

  if (!visibleBuiltIns.includes("dashboard")) {
    visibleBuiltIns.unshift("dashboard");
  }

  const customItems = input.customItems
    .map((item) => ({
      id: item.id || `custom-${crypto.randomUUID()}`,
      label: item.label.trim(),
      href: item.href.trim(),
      visibleToMembers: item.visibleToMembers !== false
    }))
    .filter((item) => item.label.length > 0 && (item.href.startsWith("/") || item.href.startsWith("https://")))
    .slice(0, 12);

  await adminDb.collection("organizations").doc(input.organizationId).set(
    {
      navigation_config: {
        visibleBuiltIns,
        customItems
      }
    },
    { merge: true }
  );

  revalidatePath("/settings");
  revalidatePath("/dashboard");

  return { error: null };
}
