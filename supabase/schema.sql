create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text unique,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  university text,
  type text check (
    type in (
      'sports_club',
      'engineering_team',
      'academic_society',
      'finance_society',
      'social_club',
      'other'
    )
  ),
  logo_url text,
  created_by uuid references public.users (id),
  created_at timestamptz default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role text not null check (role in ('president', 'secretary', 'treasurer', 'committee', 'member')),
  permission_level text not null check (permission_level in ('admin', 'committee', 'member')),
  joined_at timestamptz default now(),
  unique (user_id, organization_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references public.users (id),
  created_by uuid references public.users (id),
  due_date date,
  status text default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high')),
  recurring_rule text,
  created_at timestamptz default now()
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text,
  start_time timestamptz,
  end_time timestamptz,
  created_by uuid references public.users (id),
  created_at timestamptz default now()
);

create table if not exists public.meeting_notes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  content text,
  created_at timestamptz default now()
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text,
  type text not null check (type in ('file', 'link', 'note')),
  file_url text,
  external_url text,
  tags text[],
  uploaded_by uuid references public.users (id),
  created_at timestamptz default now()
);

create table if not exists public.handovers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role_name text not null,
  responsibilities text,
  annual_timeline text,
  key_contacts text,
  advice text,
  mistakes text,
  checklist jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  content text,
  pinned boolean default false,
  created_by uuid references public.users (id),
  created_at timestamptz default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text,
  start_time timestamptz,
  end_time timestamptz,
  location text,
  created_at timestamptz default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_user_id uuid references public.users (id),
  action text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  invited_by uuid references public.users (id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  created_at timestamptz default now(),
  unique (organization_id, email)
);

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships
    where organization_id = org_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.can_manage_org(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships
    where organization_id = org_id
      and user_id = auth.uid()
      and permission_level in ('admin', 'committee')
  );
$$;

create or replace function public.is_meeting_member(target_meeting_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.meetings m
    join public.memberships ms on ms.organization_id = m.organization_id
    where m.id = target_meeting_id
      and ms.user_id = auth.uid()
  );
$$;

create or replace function public.can_manage_meeting(target_meeting_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.meetings m
    join public.memberships ms on ms.organization_id = m.organization_id
    where m.id = target_meeting_id
      and ms.user_id = auth.uid()
      and ms.permission_level in ('admin', 'committee')
  );
$$;

alter table public.users enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.tasks enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_notes enable row level security;
alter table public.resources enable row level security;
alter table public.handovers enable row level security;
alter table public.announcements enable row level security;
alter table public.events enable row level security;
alter table public.activity_logs enable row level security;
alter table public.invites enable row level security;

create policy "users_select_self_or_shared_org"
  on public.users
  for select
  using (
    auth.uid() = id
    or exists (
      select 1
      from public.memberships viewer
      join public.memberships target on target.organization_id = viewer.organization_id
      where viewer.user_id = auth.uid()
        and target.user_id = users.id
    )
  );

create policy "users_update_self"
  on public.users
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "organizations_select_members"
  on public.organizations
  for select
  using (public.is_org_member(id));

create policy "organizations_insert_managers"
  on public.organizations
  for insert
  with check (
    auth.uid() = created_by
    or created_by is null
  );

create policy "organizations_update_managers"
  on public.organizations
  for update
  using (public.can_manage_org(id))
  with check (public.can_manage_org(id));

create policy "organizations_delete_managers"
  on public.organizations
  for delete
  using (public.can_manage_org(id));

create policy "memberships_select_members"
  on public.memberships
  for select
  using (public.is_org_member(organization_id));

create policy "memberships_insert_managers"
  on public.memberships
  for insert
  with check (
    public.can_manage_org(organization_id)
    or exists (
      select 1
      from public.organizations
      where organizations.id = memberships.organization_id
        and organizations.created_by = auth.uid()
        and memberships.user_id = auth.uid()
        and memberships.permission_level = 'admin'
        and memberships.role = 'president'
    )
  );

create policy "memberships_update_managers"
  on public.memberships
  for update
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

create policy "memberships_delete_managers"
  on public.memberships
  for delete
  using (public.can_manage_org(organization_id));

create policy "tasks_select_members"
  on public.tasks
  for select
  using (public.is_org_member(organization_id));

create policy "tasks_insert_managers"
  on public.tasks
  for insert
  with check (public.can_manage_org(organization_id));

create policy "tasks_update_managers"
  on public.tasks
  for update
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

create policy "tasks_delete_managers"
  on public.tasks
  for delete
  using (public.can_manage_org(organization_id));

create policy "meetings_select_members"
  on public.meetings
  for select
  using (public.is_org_member(organization_id));

create policy "meetings_insert_managers"
  on public.meetings
  for insert
  with check (public.can_manage_org(organization_id));

create policy "meetings_update_managers"
  on public.meetings
  for update
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

create policy "meetings_delete_managers"
  on public.meetings
  for delete
  using (public.can_manage_org(organization_id));

create policy "meeting_notes_select_members"
  on public.meeting_notes
  for select
  using (public.is_meeting_member(meeting_id));

create policy "meeting_notes_insert_managers"
  on public.meeting_notes
  for insert
  with check (public.can_manage_meeting(meeting_id));

create policy "meeting_notes_update_managers"
  on public.meeting_notes
  for update
  using (public.can_manage_meeting(meeting_id))
  with check (public.can_manage_meeting(meeting_id));

create policy "meeting_notes_delete_managers"
  on public.meeting_notes
  for delete
  using (public.can_manage_meeting(meeting_id));

create policy "resources_select_members"
  on public.resources
  for select
  using (public.is_org_member(organization_id));

create policy "resources_insert_managers"
  on public.resources
  for insert
  with check (public.can_manage_org(organization_id));

create policy "resources_update_managers"
  on public.resources
  for update
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

create policy "resources_delete_managers"
  on public.resources
  for delete
  using (public.can_manage_org(organization_id));

create policy "handovers_select_members"
  on public.handovers
  for select
  using (public.is_org_member(organization_id));

create policy "handovers_insert_managers"
  on public.handovers
  for insert
  with check (public.can_manage_org(organization_id));

create policy "handovers_update_managers"
  on public.handovers
  for update
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

create policy "handovers_delete_managers"
  on public.handovers
  for delete
  using (public.can_manage_org(organization_id));

create policy "announcements_select_members"
  on public.announcements
  for select
  using (public.is_org_member(organization_id));

create policy "announcements_insert_managers"
  on public.announcements
  for insert
  with check (public.can_manage_org(organization_id));

create policy "announcements_update_managers"
  on public.announcements
  for update
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

create policy "announcements_delete_managers"
  on public.announcements
  for delete
  using (public.can_manage_org(organization_id));

create policy "events_select_members"
  on public.events
  for select
  using (public.is_org_member(organization_id));

create policy "events_insert_managers"
  on public.events
  for insert
  with check (public.can_manage_org(organization_id));

create policy "events_update_managers"
  on public.events
  for update
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

create policy "events_delete_managers"
  on public.events
  for delete
  using (public.can_manage_org(organization_id));

create policy "activity_logs_select_members"
  on public.activity_logs
  for select
  using (public.is_org_member(organization_id));

create policy "activity_logs_insert_managers"
  on public.activity_logs
  for insert
  with check (public.can_manage_org(organization_id));

create policy "activity_logs_update_managers"
  on public.activity_logs
  for update
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

create policy "activity_logs_delete_managers"
  on public.activity_logs
  for delete
  using (public.can_manage_org(organization_id));

create policy "invites_select_members"
  on public.invites
  for select
  using (public.is_org_member(organization_id));

create policy "invites_insert_managers"
  on public.invites
  for insert
  with check (public.can_manage_org(organization_id));

create policy "invites_update_managers"
  on public.invites
  for update
  using (public.can_manage_org(organization_id))
  with check (public.can_manage_org(organization_id));

create policy "invites_delete_managers"
  on public.invites
  for delete
  using (public.can_manage_org(organization_id));

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public)
values ('org-logos', 'org-logos', true)
on conflict (id) do nothing;

create policy "org_logos_public_read"
  on storage.objects
  for select
  using (bucket_id = 'org-logos');

create policy "org_logos_authenticated_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'org-logos');

create policy "org_logos_authenticated_update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'org-logos')
  with check (bucket_id = 'org-logos');

create policy "org_logos_authenticated_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'org-logos');
