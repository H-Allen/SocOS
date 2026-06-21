"use server";

import { adminDb } from "@/lib/firebase/admin";
import { getServerFirebaseUser } from "@/lib/firebase/session";
import type { OrganizationType, TaskPriority } from "@/types";

function nowIso() {
  return new Date().toISOString();
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

type CreateOrgInput = {
  name: string;
  university: string;
  type: OrganizationType;
  logoUrl: string | null;
  userId: string;
};

export async function createOrganizationWithMembership(
  input: CreateOrgInput
): Promise<{ organizationId: string; error: string | null }> {
  const user = await getServerFirebaseUser();

  if (!user) {
    return { organizationId: "", error: "Unauthenticated." };
  }

  const now = nowIso();
  const orgRef = adminDb.collection("organizations").doc();
  const membershipId = `${orgRef.id}_${user.uid}`;

  try {
    await adminDb.runTransaction(async (transaction) => {
      transaction.set(orgRef, {
        id: orgRef.id,
        name: input.name,
        university: input.university,
        type: input.type,
        logo_url: input.logoUrl,
        created_by: user.uid,
        created_at: now
      });

      transaction.set(adminDb.collection("memberships").doc(membershipId), {
        id: membershipId,
        user_id: user.uid,
        organization_id: orgRef.id,
        role: "president",
        permission_level: "admin",
        joined_at: now
      });
    });

    return { organizationId: orgRef.id, error: null };
  } catch (error) {
    console.error("[createOrganizationWithMembership]", error);
    return {
      organizationId: "",
      error: error instanceof Error ? error.message : "Failed to create organization."
    };
  }
}

type TaskSeed = {
  title: string;
  description: string;
  priority: TaskPriority;
  dueOffsetDays: number;
};

type MeetingSeed = {
  title: string;
  description: string;
  startOffsetDays: number;
};

type AnnouncementSeed = {
  title: string;
  content: string;
};

export type TemplateSeedInput = {
  organizationId: string;
  userId: string;
  templateKey: string;
  tasks: TaskSeed[];
  meeting: MeetingSeed;
  handoverRoles: string[];
  announcement: AnnouncementSeed;
};

export async function seedTemplate(input: TemplateSeedInput): Promise<{ error: string | null }> {
  const user = await getServerFirebaseUser();

  if (!user) {
    return { error: "Unauthenticated." };
  }

  const membership = await adminDb.collection("memberships").doc(`${input.organizationId}_${user.uid}`).get();

  if (!membership.exists || membership.data()?.permission_level !== "admin") {
    return { error: "You do not have permission to seed this organization." };
  }

  const now = new Date();
  const timestamp = now.toISOString();
  const batch = adminDb.batch();
  const meetingStart = addDays(now, input.meeting.startOffsetDays);
  const meetingEnd = new Date(meetingStart);
  meetingEnd.setHours(meetingEnd.getHours() + 1);

  input.tasks.forEach((task) => {
    const ref = adminDb.collection("tasks").doc();
    batch.set(ref, {
      id: ref.id,
      organization_id: input.organizationId,
      title: task.title,
      description: task.description,
      assigned_to: user.uid,
      created_by: user.uid,
      due_date: addDays(now, task.dueOffsetDays).toISOString().slice(0, 10),
      status: "todo",
      priority: task.priority,
      source_meeting_id: null,
      recurring_rule: null,
      created_at: timestamp
    });
  });

  const meetingRef = adminDb.collection("meetings").doc();
  batch.set(meetingRef, {
    id: meetingRef.id,
    organization_id: input.organizationId,
    title: input.meeting.title,
    description: input.meeting.description,
    start_time: meetingStart.toISOString(),
    end_time: meetingEnd.toISOString(),
    created_by: user.uid,
    created_at: timestamp
  });

  input.handoverRoles.forEach((roleName) => {
    const ref = adminDb.collection("handovers").doc();
    batch.set(ref, {
      id: ref.id,
      organization_id: input.organizationId,
      role_name: roleName,
      responsibilities: null,
      annual_timeline: null,
      key_contacts: null,
      advice: null,
      mistakes: null,
      content: null,
      checklist: [],
      completion_percent: 0,
      updated_at: timestamp,
      created_at: timestamp
    });
  });

  const announcementRef = adminDb.collection("announcements").doc();
  batch.set(announcementRef, {
    id: announcementRef.id,
    organization_id: input.organizationId,
    title: input.announcement.title,
    content: input.announcement.content,
    pinned: true,
    created_by: user.uid,
    created_at: timestamp
  });

  const activityRef = adminDb.collection("activity_logs").doc();
  batch.set(activityRef, {
    id: activityRef.id,
    organization_id: input.organizationId,
    actor_user_id: user.uid,
    action: `completed onboarding with the ${input.templateKey.replace("_", " ")} template`,
    metadata: { template: input.templateKey },
    created_at: timestamp
  });

  try {
    await batch.commit();
    return { error: null };
  } catch (error) {
    console.error("[seedTemplate]", error);
    return { error: error instanceof Error ? error.message : "Failed to seed organization." };
  }
}
