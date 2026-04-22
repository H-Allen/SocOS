import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  MembershipRow,
  OrganizationRow,
  PermissionLevel,
  OrganizationWithMembership,
  MembershipRole,
  UserRow
} from "@/types";

export async function getCurrentUser(): Promise<UserRow | null> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user: authUser },
    error: authError
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!authUser) {
    return null;
  }

  const { data, error } = await supabase.from("users").select("*").eq("id", authUser.id).single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getUserMemberships(): Promise<OrganizationWithMembership[]> {
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("role, permission_level, organization:organizations(*)")
    .eq("user_id", user.id)
    .returns<Array<{ role: MembershipRole; permission_level: PermissionLevel; organization: OrganizationRow }>>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((membership) => ({
    ...(membership.organization as OrganizationRow),
    membership: {
      role: membership.role,
      permission_level: membership.permission_level
    }
  }));
}

export async function getOrganization(orgId: string): Promise<OrganizationRow | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("organizations").select("*").eq("id", orgId).maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getOrgMembers(
  orgId: string
): Promise<Array<MembershipRow & { user: UserRow | null }>> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("id, user_id, organization_id, role, permission_level, joined_at, user:users(*)")
    .eq("organization_id", orgId)
    .order("joined_at", { ascending: true })
    .returns<Array<MembershipRow & { user: UserRow | null }>>();

  if (error) {
    throw error;
  }

  return (data ?? []).map((membership) => ({
    id: membership.id,
    user_id: membership.user_id,
    organization_id: membership.organization_id,
    role: membership.role as MembershipRole,
    permission_level: membership.permission_level as PermissionLevel,
    joined_at: membership.joined_at,
    user: membership.user as UserRow | null
  }));
}
