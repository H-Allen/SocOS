"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { adminDb } from "@/lib/firebase/admin";
import { getServerFirebaseUser } from "@/lib/firebase/session";
import type { UserRow } from "@/types";

const profileSchema = z.object({
  fullName: z.string().min(1).max(120),
  phone: z.string().max(80).optional()
});

export async function updateProfile(input: z.input<typeof profileSchema>): Promise<{ user: UserRow | null; error: string | null }> {
  const auth = await getServerFirebaseUser();
  if (!auth) return { user: null, error: "Unauthenticated." };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { user: null, error: "Enter a valid profile." };

  const ref = adminDb.collection("users").doc(auth.uid);
  const update = {
    full_name: parsed.data.fullName.trim(),
    phone: parsed.data.phone?.trim() || null
  };

  await ref.set(update, { merge: true });
  const snap = await ref.get();
  revalidatePath("/dashboard");
  revalidatePath("/members");

  return { user: ({ id: snap.id, ...snap.data() } as UserRow), error: null };
}
