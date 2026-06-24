"use server";

import { revalidatePath } from "next/cache";

import { adminDb } from "@/lib/firebase/admin";
import { getServerFirebaseUser } from "@/lib/firebase/session";

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

  if (!membership.exists || membership.data()?.permission_level !== "admin") {
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
