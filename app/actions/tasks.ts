"use server";

import { z } from "zod";

import { adminDb } from "@/lib/firebase/admin";
import { getServerFirebaseUser } from "@/lib/firebase/session";
import { permissionForRole } from "@/lib/workspace";
import type { MembershipRole, PermissionLevel, TaskPriority, TaskRecord, TaskStatus, TaskVisibility } from "@/types";

const statusSchema = z.enum(["todo", "in_progress", "done"]);
const prioritySchema = z.enum(["low", "medium", "high"]);
const visibilitySchema = z.enum(["organization", "team", "private"]);

type MembershipData = {
  id: string;
  user_id: string;
  organization_id: string;
  role: MembershipRole;
  permission_level: PermissionLevel;
  team_id?: string | null;
  team_lead_user_id?: string | null;
};

type TeamData = {
  id: string;
  organization_id: string;
  name: string;
  lead_user_id: string;
};

function nowIso() {
  return new Date().toISOString();
}

function effectivePermission(membership: MembershipData | FirebaseFirestore.DocumentData | undefined): PermissionLevel {
  if (!membership) return "member";
  const rolePermission = permissionForRole(membership.role as MembershipRole);
  return rolePermission === "admin" ? "admin" : (membership.permission_level as PermissionLevel) ?? rolePermission;
}

function canManage(permission: PermissionLevel) {
  return permission === "admin" || permission === "committee";
}

async function getMembership(organizationId: string, userId: string): Promise<MembershipData | null> {
  const snap = await adminDb.collection("memberships").doc(`${organizationId}_${userId}`).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as MembershipData;
}

async function getTeam(organizationId: string, teamId: string | null | undefined): Promise<TeamData | null> {
  if (!teamId) return null;
  const snap = await adminDb.collection("teams").doc(teamId).get();
  if (!snap.exists || snap.data()?.organization_id !== organizationId) return null;
  return { id: snap.id, ...snap.data() } as TeamData;
}

async function canLeadAssignee(organizationId: string, leadUserId: string, assigneeId: string | null | undefined, teamId?: string | null) {
  if (!assigneeId || assigneeId === leadUserId) return true;
  const assigneeMembership = await getMembership(organizationId, assigneeId);
  return assigneeMembership?.team_lead_user_id === leadUserId && (!teamId || assigneeMembership.team_id === teamId);
}

async function hydrateTask(taskId: string): Promise<TaskRecord | null> {
  const taskSnap = await adminDb.collection("tasks").doc(taskId).get();
  if (!taskSnap.exists) return null;
  const task = { id: taskSnap.id, ...taskSnap.data() } as TaskRecord;

  if (!task.assigned_to) {
    return { ...task, assignee: null };
  }

  const userSnap = await adminDb.collection("users").doc(task.assigned_to).get();
  return {
    ...task,
    assignee: userSnap.exists ? ({ id: userSnap.id, ...userSnap.data() } as TaskRecord["assignee"]) : null
  };
}

async function logTaskActivity(organizationId: string, userId: string, action: string, taskId: string) {
  const activityRef = adminDb.collection("activity_logs").doc();
  await activityRef.set({
    id: activityRef.id,
    organization_id: organizationId,
    actor_user_id: userId,
    action,
    metadata: { task_id: taskId },
    created_at: nowIso()
  });
}

export async function createTask(input: {
  organizationId: string;
  title: string;
  description?: string | null;
  assignedTo?: string | null;
  dueDate?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  visibility: TaskVisibility;
  teamId?: string | null;
}): Promise<{ task: TaskRecord | null; error: string | null }> {
  const user = await getServerFirebaseUser();
  if (!user) return { task: null, error: "Unauthenticated." };

  const membership = await getMembership(input.organizationId, user.uid);
  if (!membership) return { task: null, error: "You are not a member of this society." };

  const title = input.title.trim();
  const visibility = visibilitySchema.parse(input.visibility);
  const priority = prioritySchema.parse(input.priority);
  const status = statusSchema.parse(input.status);
  const permission = effectivePermission(membership);

  if (!title) return { task: null, error: "Title is required." };

  let assignedTo = input.assignedTo || null;
  let teamId: string | null = null;
  let teamLeadUserId: string | null = null;

  if (visibility === "private") {
    assignedTo = user.uid;
    teamId = null;
    teamLeadUserId = null;
  } else if (visibility === "team") {
    const team = await getTeam(input.organizationId, input.teamId);

    if (!team) {
      return { task: null, error: "Choose a valid team for this task." };
    }

    if (permission === "member") {
      return { task: null, error: "Members can only create private todos." };
    }

    if (permission === "committee" && team.lead_user_id !== user.uid) {
      return { task: null, error: "Committee members can only create tasks for teams they lead." };
    }

    if (!(await canLeadAssignee(input.organizationId, team.lead_user_id, assignedTo, team.id))) {
      return { task: null, error: "Team tasks can only be assigned to members of that team." };
    }

    teamId = team.id;
    teamLeadUserId = team.lead_user_id;
  } else if (permission === "admin") {
    teamId = null;
    teamLeadUserId = null;
  } else if (permission === "committee") {
    if (!(await canLeadAssignee(input.organizationId, user.uid, assignedTo))) {
      return { task: null, error: "Committee members can only assign tasks to themselves or their team." };
    }
    teamId = null;
    teamLeadUserId = user.uid;
  } else {
    return { task: null, error: "Members can only create private todos." };
  }

  const taskRef = adminDb.collection("tasks").doc();
  const now = nowIso();

  await taskRef.set({
    id: taskRef.id,
    organization_id: input.organizationId,
    title,
    description: input.description?.trim() || null,
    assigned_to: assignedTo,
    created_by: user.uid,
    visibility,
    team_id: teamId,
    team_lead_user_id: teamLeadUserId,
    source_meeting_id: null,
    due_date: input.dueDate || null,
    status,
    priority,
    recurring_rule: null,
    created_at: now
  });

  await logTaskActivity(input.organizationId, user.uid, visibility === "private" ? "created a private todo" : "created a task", taskRef.id);

  return { task: await hydrateTask(taskRef.id), error: null };
}

export async function updateTask(input: {
  taskId: string;
  title?: string;
  description?: string | null;
  assignedTo?: string | null;
  teamId?: string | null;
  dueDate?: string | null;
  priority?: TaskPriority | null;
  status?: TaskStatus | null;
  recurringRule?: string | null;
}): Promise<{ task: TaskRecord | null; error: string | null }> {
  const user = await getServerFirebaseUser();
  if (!user) return { task: null, error: "Unauthenticated." };

  const taskRef = adminDb.collection("tasks").doc(input.taskId);
  const taskSnap = await taskRef.get();
  if (!taskSnap.exists) return { task: null, error: "Task not found." };

  const task = { id: taskSnap.id, ...taskSnap.data() } as TaskRecord;
  const membership = await getMembership(task.organization_id, user.uid);
  if (!membership) return { task: null, error: "You are not a member of this society." };

  const permission = effectivePermission(membership);
  const isPrivateOwner = task.visibility === "private" && task.created_by === user.uid;
  const isAssignee = task.assigned_to === user.uid;
  const isTeamLead = task.team_lead_user_id === user.uid;
  const canFullyEdit = permission === "admin" || isPrivateOwner || (permission === "committee" && isTeamLead);
  const update: Record<string, unknown> = {};

  if (!canFullyEdit) {
    if (!isAssignee || !input.status) {
      return { task: null, error: "You can only update the status of tasks assigned to you." };
    }
    update.status = statusSchema.parse(input.status);
  } else {
    if (typeof input.title === "string") update.title = input.title.trim();
    if ("description" in input) update.description = input.description?.trim() || null;
    if ("assignedTo" in input) {
      if (task.visibility === "team") {
        if (!(await canLeadAssignee(task.organization_id, task.team_lead_user_id ?? user.uid, input.assignedTo, task.team_id))) {
          return { task: null, error: "Team tasks can only be assigned to members of that team." };
        }
      } else if (permission === "committee" && !(await canLeadAssignee(task.organization_id, user.uid, input.assignedTo))) {
        return { task: null, error: "Committee members can only assign tasks within their team." };
      }
      update.assigned_to = input.assignedTo || null;
    }
    if ("dueDate" in input) update.due_date = input.dueDate || null;
    if (input.priority) update.priority = prioritySchema.parse(input.priority);
    if (input.status) update.status = statusSchema.parse(input.status);
    if ("recurringRule" in input) update.recurring_rule = input.recurringRule?.trim() || null;
  }

  await taskRef.update(update);
  await logTaskActivity(task.organization_id, user.uid, update.status && Object.keys(update).length === 1 ? `moved a task to ${String(update.status).replace("_", " ")}` : "updated a task", task.id);

  return { task: await hydrateTask(task.id), error: null };
}

export async function deleteTask(input: { taskId: string }): Promise<{ error: string | null }> {
  const user = await getServerFirebaseUser();
  if (!user) return { error: "Unauthenticated." };

  const taskRef = adminDb.collection("tasks").doc(input.taskId);
  const taskSnap = await taskRef.get();
  if (!taskSnap.exists) return { error: "Task not found." };

  const task = { id: taskSnap.id, ...taskSnap.data() } as TaskRecord;
  const membership = await getMembership(task.organization_id, user.uid);
  if (!membership) return { error: "You are not a member of this society." };

  const permission = effectivePermission(membership);
  const canDelete = permission === "admin" || (permission === "committee" && task.team_lead_user_id === user.uid) || (task.visibility === "private" && task.created_by === user.uid);

  if (!canDelete) return { error: "You do not have permission to delete this task." };

  await taskRef.delete();
  await logTaskActivity(task.organization_id, user.uid, "deleted a task", task.id);
  return { error: null };
}
