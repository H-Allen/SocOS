# SocietyOS

SocietyOS is a multi-tenant SaaS app for university societies. The goal is to give each society its own secure workspace for committee operations: members, tasks, meetings, notes, resources, handovers, announcements, events, and activity logs.

This repository currently provides the project foundation:

- Next.js 14 with the App Router and TypeScript
- Tailwind CSS with a shadcn-style component setup
- Supabase SSR client wiring for browser, server, and middleware usage
- Route protection and session refresh middleware
- A full authenticated app shell with sidebar, navbar, org switching, and global command search
- A multi-step onboarding flow for first-time users
- A real server-rendered dashboard using live Supabase data
- A full Tasks experience with Kanban, table, my-tasks, creation, and drawer editing
- A Meetings experience with list views and a detail page for notes, agenda, attendees, and action items
- A full Supabase SQL schema with row-level security policies
- Typed database models and a small query layer
- A premium dark-mode-first visual system with loading and empty states

This README is part of the codebase contract. It should be updated whenever the architecture, setup flow, runtime behavior, or developer workflow changes.

## What the app does

At a product level, SocietyOS is intended to help a university society run like a small organization:

- `organizations` represent societies or clubs
- `memberships` connect users to organizations with roles and permissions
- `tasks` track committee work and assignment
- `meetings` and `meeting_notes` capture operational context
- `resources` store files, links, and notes
- `handovers` preserve institutional memory between committees
- `announcements` and `events` support member communication and planning
- `activity_logs` create an audit trail

The app is multi-tenant. Data isolation is enforced in the database with Supabase Row Level Security so members only see data for organizations they belong to.

## Tech stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- shadcn-style component structure in `components/ui`
- Supabase Auth + Postgres + RLS
- `@supabase/ssr` for server/browser session support
- `react-hook-form`, `zod`, and `@hookform/resolvers` for forms and validation
- `@hello-pangea/dnd` for task drag-and-drop
- `@tanstack/react-table` for the task table
- `react-simple-wysiwyg` for meeting notes editing

## Current app structure

```text
SocOS/
├── app/
│   ├── (app)/
│   │   ├── announcements/
│   │   ├── calendar/
│   │   ├── dashboard/
│   │   ├── handovers/
│   │   ├── meetings/
│   │   │   └── [id]/
│   │   ├── members/
│   │   ├── resources/
│   │   ├── settings/
│   │   ├── tasks/
│   │   └── layout.tsx
│   ├── auth/
│   │   ├── callback/
│   │   │   └── route.ts
│   │   └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── onboarding/
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── layout/
│   │   ├── AppPage.tsx
│   │   ├── CommandMenu.tsx
│   │   ├── Navbar.tsx
│   │   └── Sidebar.tsx
│   ├── meetings/
│   │   ├── CreateMeetingModal.tsx
│   │   ├── MeetingDetailClient.tsx
│   │   └── MeetingsWorkspace.tsx
│   ├── onboarding/
│   │   └── OnboardingWizard.tsx
│   ├── tasks/
│   │   ├── CreateTaskModal.tsx
│   │   ├── KanbanBoard.tsx
│   │   ├── TaskDetailDrawer.tsx
│   │   ├── TaskTable.tsx
│   │   └── TasksWorkspace.tsx
│   └── ui/
│       ├── avatar.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── command.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── EmptyState.tsx
│       ├── form.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── PageLoader.tsx
│       ├── CardSkeleton.tsx
│       ├── sheet.tsx
│       ├── skeleton.tsx
│       └── textarea.tsx
├── hooks/
│   └── use-mounted.ts
├── lib/
│   ├── org-server.ts
│   ├── org-context.tsx
│   ├── org-state.ts
│   └── supabase/
│       ├── client.ts
│       ├── middleware.ts
│       ├── queries.ts
│       └── server.ts
├── supabase/
│   └── schema.sql
├── types/
│   ├── database.ts
│   └── index.ts
├── utils/
│   ├── cn.ts
│   └── format.ts
├── middleware.ts
├── package.json
├── tailwind.config.ts
└── .env.local.example
```

## How the codebase works

### 1. Routing

This project uses the Next.js App Router.

- `app/page.tsx` redirects `/` to `/dashboard`
- `app/login/page.tsx` is the public login/landing page
- `app/auth/callback/route.ts` handles Supabase auth code exchange
- `app/(app)/layout.tsx` is the authenticated shell wrapper
- `app/(app)/*` contains the protected product routes
- `app/onboarding/page.tsx` is the first-time setup flow for authenticated users with no memberships
- `app/auth/page.tsx` redirects `/auth` to `/login`

The route group `(app)` is used to separate authenticated app UI from public pages without affecting the final URL.

Protected routes currently include:

- `/dashboard`
- `/tasks`
- `/meetings`
- `/resources`
- `/handovers`
- `/members`
- `/calendar`
- `/announcements`
- `/settings`

### 2. Authentication and sessions

Supabase auth is wired for both server and client contexts:

- [`lib/supabase/client.ts`](/Users/harveyallen/Documents/Projects/SocOS/lib/supabase/client.ts) creates the browser client
- [`lib/supabase/server.ts`](/Users/harveyallen/Documents/Projects/SocOS/lib/supabase/server.ts) creates the server client using Next cookies
- [`lib/supabase/middleware.ts`](/Users/harveyallen/Documents/Projects/SocOS/lib/supabase/middleware.ts) refreshes sessions and handles redirects
- [`middleware.ts`](/Users/harveyallen/Documents/Projects/SocOS/middleware.ts) applies that logic to incoming requests

Current middleware behavior:

- Protects all authenticated app routes plus `/onboarding`
- Redirects unauthenticated users from protected routes to `/login`
- Preserves the intended destination in the `next` query param
- Redirects authenticated users away from `/login` and `/auth` to `/dashboard`
- Refreshes Supabase cookies during the request lifecycle

Authenticated shell behavior in `app/(app)/layout.tsx`:

- Calls `getCurrentUser()` and redirects to `/login` if there is no active session
- Calls `getUserMemberships()` and redirects to `/onboarding` if the user has no organizations
- Wraps the protected UI in `OrgProvider`
- Renders a fixed-width sidebar and a full-height main content area

### 3. Onboarding

The onboarding flow lives in:

- [`app/onboarding/page.tsx`](/Users/harveyallen/Documents/Projects/SocOS/app/onboarding/page.tsx)
- [`components/onboarding/OnboardingWizard.tsx`](/Users/harveyallen/Documents/Projects/SocOS/components/onboarding/OnboardingWizard.tsx)

It is a 3-step client-side flow for users with no memberships:

1. Create the organization
2. Queue team invites
3. Choose a starter template

Step 1:

- validates organization details with `react-hook-form` + `zod`
- optionally uploads a logo to the `org-logos` Supabase Storage bucket
- inserts a row into `organizations`
- inserts the creator’s first `memberships` row as `president` + `admin`

Step 2:

- accepts comma-separated email addresses
- stores pending invite rows in `public.invites`
- records per-email success or duplicate/error feedback in the UI

Step 3:

- seeds starter data based on the chosen organization template
- creates sample tasks, one meeting, handover stubs, a welcome announcement, and activity logs
- redirects to `/dashboard`

### 4. Database access

The typed query layer lives in [`lib/supabase/queries.ts`](/Users/harveyallen/Documents/Projects/SocOS/lib/supabase/queries.ts). Right now it includes:

- `getCurrentUser()`
- `getUserMemberships()`
- `getOrganization(orgId)`
- `getOrgMembers(orgId)`

These helpers are server-side helpers built on the SSR Supabase client and typed with the database models in [`types/database.ts`](/Users/harveyallen/Documents/Projects/SocOS/types/database.ts).

The query layer now also includes dashboard-focused helpers such as:

- `getCurrentOrganization()`
- `getDashboardTasks(orgId, userId)`
- `getUpcomingMeetings(orgId)`
- `getRecentActivity(orgId)`
- `getDashboardAnnouncements(orgId)`
- `getHealthCounts(orgId)`

It also includes typed task and meeting helpers such as:

- `getOrganizationTasks(orgId)`
- `getTaskActivity(orgId, taskId)`
- `getMeetingsByTime(orgId)`
- `getMeetingDetails(meetingId)`
- `getMeetingActionItems(meetingId)`

### 5. Styling and UI

Tailwind is configured in [`tailwind.config.ts`](/Users/harveyallen/Documents/Projects/SocOS/tailwind.config.ts). Global styles live in [`app/globals.css`](/Users/harveyallen/Documents/Projects/SocOS/app/globals.css).

The current design system is dark-mode-first and driven by CSS variables:

- `--background`
- `--surface`
- `--surface-2`
- `--border`
- `--accent`
- `--accent-hover`
- `--text-primary`
- `--text-secondary`
- `--text-muted`

The root layout imports Inter with `next/font/google` and applies it globally.

UI primitives currently live in [`components/ui`](/Users/harveyallen/Documents/Projects/SocOS/components/ui) and follow the shadcn pattern:

- `avatar.tsx`
- `button.tsx`
- `card.tsx`
- `command.tsx`
- `dialog.tsx`
- `dropdown-menu.tsx`
- `EmptyState.tsx`
- `input.tsx`
- `label.tsx`
- `PageLoader.tsx`
- `CardSkeleton.tsx`
- `sheet.tsx`
- `skeleton.tsx`
- `textarea.tsx`
- `form.tsx`

Shared utility helpers:

- [`utils/cn.ts`](/Users/harveyallen/Documents/Projects/SocOS/utils/cn.ts): merges Tailwind class names with `clsx` and `tailwind-merge`
- [`utils/format.ts`](/Users/harveyallen/Documents/Projects/SocOS/utils/format.ts): date and text formatting helpers

Layout and shell components live in [`components/layout`](/Users/harveyallen/Documents/Projects/SocOS/components/layout):

- `Sidebar.tsx`: fixed 240px sidebar with org switcher and primary navigation
- `Navbar.tsx`: sticky top nav with title, search trigger, notifications, and user dropdown
- `CommandMenu.tsx`: global `Cmd+K` search scoped to the active organization
- `AppPage.tsx`: shared wrapper used by placeholder product routes

Organization selection state lives in [`lib/org-context.tsx`](/Users/harveyallen/Documents/Projects/SocOS/lib/org-context.tsx), which:

- receives memberships from the server layout
- persists the active organization in `localStorage`
- exposes `currentOrg`, `setCurrentOrg`, and `memberships` to client components

The active organization is also mirrored into a cookie through [`lib/org-state.ts`](/Users/harveyallen/Documents/Projects/SocOS/lib/org-state.ts) and resolved on the server through [`lib/org-server.ts`](/Users/harveyallen/Documents/Projects/SocOS/lib/org-server.ts). This is what allows server-rendered pages like the dashboard to follow the same organization selection as the sidebar.

## Database design

The complete schema is in [`supabase/schema.sql`](/Users/harveyallen/Documents/Projects/SocOS/supabase/schema.sql).

### Tables

- `users`
- `organizations`
- `memberships`
- `tasks`
- `meetings`
- `meeting_notes`
- `meeting_attendees`
- `meeting_agenda_items`
- `resources`
- `handovers`
- `announcements`
- `events`
- `activity_logs`
- `invites`

### Tenant model

Tenant scoping is organization-based:

- A user belongs to one or more organizations through `memberships`
- Most operational tables include `organization_id`
- `meeting_notes` are scoped indirectly through `meetings`
- Access is controlled with helper SQL functions and RLS policies

### Permission model

Memberships store two dimensions of access:

- `role`: `president`, `secretary`, `treasurer`, `committee`, `member`
- `permission_level`: `admin`, `committee`, `member`

RLS currently enforces:

- Members can read data for organizations they belong to
- Only `admin` and `committee` permission levels can insert, update, or delete organization-scoped data
- Users can read their own user row
- Users can update only their own user row
- Organization creators can bootstrap the first membership row for their newly created organization during onboarding

### Automatic user provisioning

When a new Supabase auth user signs up, a trigger runs `handle_new_user()` and creates a matching row in `public.users` using:

- `new.id`
- `new.email`
- `new.raw_user_meta_data->>'full_name'`
- `new.raw_user_meta_data->>'avatar_url'`

That means application code can rely on the `users` table as the profile layer on top of `auth.users`.

## Type system

Typed database models live in [`types/database.ts`](/Users/harveyallen/Documents/Projects/SocOS/types/database.ts).

This file contains:

- string union types for constrained fields such as organization type, membership role, permission level, task status, task priority, and resource type
- row interfaces for every table
- insert and update shapes for every table
- a `Database` interface compatible with Supabase generics

[`types/index.ts`](/Users/harveyallen/Documents/Projects/SocOS/types/index.ts) re-exports the database types and adds a few app-friendly composite types:

- `OrganizationWithMembership`
- `TaskWithAssignee`
- `MeetingWithNotes`

## Setup guide

### Prerequisites

Install these locally before you start:

- Node.js 18.17+ or Node.js 20+
- npm
- A Supabase project

You can check your Node version with:

```bash
node -v
```

### 1. Install dependencies

From the repository root:

```bash
npm install
```

### 2. Create your local environment file

Copy the example env file:

```bash
cp .env.local.example .env.local
```

Then fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

What each variable does:

- `NEXT_PUBLIC_SUPABASE_URL`: your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public client key used by browser and SSR clients
- `SUPABASE_SERVICE_ROLE_KEY`: elevated server key for future admin/server-only operations

Important:

- Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the browser
- The current foundation does not yet use the service role key in code
- Keep `.env.local` out of version control

### 3. Create the Supabase project

In Supabase:

1. Create a new project.
2. Open Project Settings.
3. Copy the project URL and API keys into `.env.local`.

### 4. Apply the database schema

Open the Supabase SQL Editor and run the contents of [`supabase/schema.sql`](/Users/harveyallen/Documents/Projects/SocOS/supabase/schema.sql).

This will:

- create the app tables
- create helper permission functions
- enable row-level security
- create RLS policies
- create the `handle_new_user` trigger function
- create the `on_auth_user_created` trigger

If you prefer the Supabase CLI, you can also paste the schema into a migration and apply it through your normal migration flow. At the moment this repo does not yet include a Supabase CLI config or generated migrations directory.

### 5. Configure Supabase Auth

To make sign-in work correctly, configure these in Supabase Auth:

1. Set your site URL for local development, usually `http://localhost:3000`.
2. Add a redirect URL for the auth callback:

```text
http://localhost:3000/auth/callback
```

If you deploy later, add your production callback URL too.

### 6. Storage setup

The SQL schema now also provisions a public Storage bucket:

- `org-logos`

This bucket is used during onboarding for optional organization logo uploads.

### 7. Run the app

Development:

```bash
npm run dev
```

Production build check:

```bash
npm run build
```

Production server:

```bash
npm run start
```

Note on fonts:

- the root layout uses Inter from Google Fonts through `next/font/google`
- the first production build may need network access so Next can fetch the font during build time

## How login works right now

The current UI is a foundation, not a complete auth flow. The login page explains where Supabase Auth should connect, but it does not yet render provider buttons or an email/password form wired to Supabase.

The backend flow is ready for the callback stage:

1. A user signs in via Supabase Auth.
2. Supabase redirects back to `/auth/callback` with an auth code.
3. [`app/auth/callback/route.ts`](/Users/harveyallen/Documents/Projects/SocOS/app/auth/callback/route.ts) exchanges that code for a session.
4. Middleware refreshes the session and protects app routes.
5. The new-user trigger inserts a row into `public.users`.

To finish auth UI in a future iteration, you would typically:

- add a client-side auth form or OAuth buttons on `/login`
- call the browser Supabase client from `lib/supabase/client.ts`
- redirect to Supabase’s auth flow
- return to `/auth/callback`

## How the authenticated shell works

Once a user is authenticated and has at least one membership:

1. Middleware refreshes the Supabase session and allows the request through.
2. `app/(app)/layout.tsx` fetches the current user profile and memberships.
3. `OrgProvider` hydrates the client with all available memberships and restores the last selected organization from `localStorage`.
4. `Sidebar` renders the org switcher, primary navigation, settings, and user summary.
5. Each page renders a `Navbar` with the current page title.
6. The navbar opens `CommandMenu`, which fetches tasks, members, meetings, resources, and handovers for the active organization only.

That means the shell is organization-aware before any feature-specific pages are fully implemented.

## How onboarding works

The onboarding route is shown only to authenticated users with zero memberships.

Once they complete the wizard:

1. A new organization is created.
2. The creator becomes the first admin member.
3. The chosen organization is written to both `localStorage` and a cookie so the app shell immediately treats it as active.
4. Optional invites are stored as pending records.
5. Starter template data is seeded.
6. The user is redirected into the live dashboard.

## How the dashboard works

[`app/(app)/dashboard/page.tsx`](/Users/harveyallen/Documents/Projects/SocOS/app/(app)/dashboard/page.tsx) is a server component.

It:

- reads the current user and memberships
- resolves the active organization from the synced cookie
- fetches dashboard data with `Promise.all`
- renders a 12-column layout with:
  - My Tasks
  - Upcoming Meetings
  - Recent Activity
  - Announcements
  - Org Health

Dashboard data sources:

- `tasks` assigned to the current user
- `meetings` in the next 7 days
- recent `activity_logs`
- latest `announcements`, pinned first
- health counts derived from tasks, handovers, memberships, and meetings

## How tasks work

The Tasks route now supports:

- Kanban
- Table
- My Tasks

Core files:

- [`app/(app)/tasks/page.tsx`](/Users/harveyallen/Documents/Projects/SocOS/app/(app)/tasks/page.tsx)
- [`components/tasks/TasksWorkspace.tsx`](/Users/harveyallen/Documents/Projects/SocOS/components/tasks/TasksWorkspace.tsx)
- [`components/tasks/KanbanBoard.tsx`](/Users/harveyallen/Documents/Projects/SocOS/components/tasks/KanbanBoard.tsx)
- [`components/tasks/TaskTable.tsx`](/Users/harveyallen/Documents/Projects/SocOS/components/tasks/TaskTable.tsx)
- [`components/tasks/TaskDetailDrawer.tsx`](/Users/harveyallen/Documents/Projects/SocOS/components/tasks/TaskDetailDrawer.tsx)
- [`components/tasks/CreateTaskModal.tsx`](/Users/harveyallen/Documents/Projects/SocOS/components/tasks/CreateTaskModal.tsx)

Behavior:

- Kanban drag-and-drop updates task status optimistically and then persists to Supabase
- Table supports sorting and filtering by status, priority, and assignee
- My Tasks prefilters to the current user’s assignments
- Task creation and updates log to `activity_logs`
- Task details open in a right-side drawer and auto-save with a debounce

Task activity is currently stored in `activity_logs` using `metadata.task_id`.

## How meetings work

The Meetings route now supports:

- upcoming and past tabs
- meeting creation
- a detail page at `/meetings/[id]`

Core files:

- [`app/(app)/meetings/page.tsx`](/Users/harveyallen/Documents/Projects/SocOS/app/(app)/meetings/page.tsx)
- [`app/(app)/meetings/[id]/page.tsx`](/Users/harveyallen/Documents/Projects/SocOS/app/(app)/meetings/[id]/page.tsx)
- [`components/meetings/MeetingsWorkspace.tsx`](/Users/harveyallen/Documents/Projects/SocOS/components/meetings/MeetingsWorkspace.tsx)
- [`components/meetings/CreateMeetingModal.tsx`](/Users/harveyallen/Documents/Projects/SocOS/components/meetings/CreateMeetingModal.tsx)
- [`components/meetings/MeetingDetailClient.tsx`](/Users/harveyallen/Documents/Projects/SocOS/components/meetings/MeetingDetailClient.tsx)

Meeting detail currently supports:

- editable header details
- attendee add/remove
- agenda add/reorder/delete
- rich-text notes autosave every 5 seconds
- action item creation into `tasks`
- minutes export to markdown

Supporting schema additions:

- `meeting_attendees`
- `meeting_agenda_items`
- `tasks.source_meeting_id`

## How to use this foundation

### For developers

Use this repository as the base for the actual product features. A typical next step would be:

1. Build the real login/signup UI.
2. Add real onboarding actions for creating or joining an organization.
3. Replace the route empty states with real CRUD experiences.
4. Add form validation with `zod` and `react-hook-form`.
5. Expand the query layer or add server actions for mutations.
6. Add detail views, pagination, and richer command search behavior.

### For end users

End-user workflows are not fully implemented yet. The current app is a styled, working foundation with the database, types, auth/session infrastructure, and starter screens in place.

Once features are added, end users will be able to:

- sign in
- join or create a society workspace
- view members and committee roles
- manage tasks and meetings
- store society resources
- keep handovers between yearly committees

## Key files explained

### App shell

- [`app/layout.tsx`](/Users/harveyallen/Documents/Projects/SocOS/app/layout.tsx): root HTML layout and metadata
- [`app/globals.css`](/Users/harveyallen/Documents/Projects/SocOS/app/globals.css): global Tailwind styles and CSS variables
- [`app/page.tsx`](/Users/harveyallen/Documents/Projects/SocOS/app/page.tsx): redirects to the dashboard
- [`app/login/page.tsx`](/Users/harveyallen/Documents/Projects/SocOS/app/login/page.tsx): public login/marketing shell
- [`app/(app)/layout.tsx`](/Users/harveyallen/Documents/Projects/SocOS/app/(app)/layout.tsx): authenticated layout with membership gating
- [`app/onboarding/page.tsx`](/Users/harveyallen/Documents/Projects/SocOS/app/onboarding/page.tsx): membership-empty onboarding gate
- [`components/onboarding/OnboardingWizard.tsx`](/Users/harveyallen/Documents/Projects/SocOS/components/onboarding/OnboardingWizard.tsx): multi-step org creation, invite, and template flow
- [`app/(app)/dashboard/page.tsx`](/Users/harveyallen/Documents/Projects/SocOS/app/(app)/dashboard/page.tsx): live dashboard widgets backed by Supabase data
- [`app/(app)/tasks/page.tsx`](/Users/harveyallen/Documents/Projects/SocOS/app/(app)/tasks/page.tsx): full tasks workspace with multiple views
- [`app/(app)/meetings/page.tsx`](/Users/harveyallen/Documents/Projects/SocOS/app/(app)/meetings/page.tsx): meetings list workspace
- [`app/(app)/meetings/[id]/page.tsx`](/Users/harveyallen/Documents/Projects/SocOS/app/(app)/meetings/[id]/page.tsx): meeting detail route
- [`app/(app)/*/page.tsx`](/Users/harveyallen/Documents/Projects/SocOS/app/(app)): protected route pages rendered inside the shell

### Authenticated UI shell

- [`components/layout/Sidebar.tsx`](/Users/harveyallen/Documents/Projects/SocOS/components/layout/Sidebar.tsx): primary left rail and org switcher
- [`components/layout/Navbar.tsx`](/Users/harveyallen/Documents/Projects/SocOS/components/layout/Navbar.tsx): sticky top bar for every product page
- [`components/layout/CommandMenu.tsx`](/Users/harveyallen/Documents/Projects/SocOS/components/layout/CommandMenu.tsx): org-scoped global search
- [`components/layout/AppPage.tsx`](/Users/harveyallen/Documents/Projects/SocOS/components/layout/AppPage.tsx): reusable placeholder route wrapper

### Tasks and Meetings

- [`components/tasks/TasksWorkspace.tsx`](/Users/harveyallen/Documents/Projects/SocOS/components/tasks/TasksWorkspace.tsx): top-level tasks client workspace
- [`components/tasks/KanbanBoard.tsx`](/Users/harveyallen/Documents/Projects/SocOS/components/tasks/KanbanBoard.tsx): drag-and-drop board
- [`components/tasks/TaskTable.tsx`](/Users/harveyallen/Documents/Projects/SocOS/components/tasks/TaskTable.tsx): sortable/filterable table
- [`components/tasks/TaskDetailDrawer.tsx`](/Users/harveyallen/Documents/Projects/SocOS/components/tasks/TaskDetailDrawer.tsx): auto-saving task editor
- [`components/tasks/CreateTaskModal.tsx`](/Users/harveyallen/Documents/Projects/SocOS/components/tasks/CreateTaskModal.tsx): task creation flow
- [`components/meetings/MeetingsWorkspace.tsx`](/Users/harveyallen/Documents/Projects/SocOS/components/meetings/MeetingsWorkspace.tsx): upcoming/past meeting views
- [`components/meetings/CreateMeetingModal.tsx`](/Users/harveyallen/Documents/Projects/SocOS/components/meetings/CreateMeetingModal.tsx): meeting creation flow
- [`components/meetings/MeetingDetailClient.tsx`](/Users/harveyallen/Documents/Projects/SocOS/components/meetings/MeetingDetailClient.tsx): editable meeting detail UI

### Supabase integration

- [`lib/supabase/client.ts`](/Users/harveyallen/Documents/Projects/SocOS/lib/supabase/client.ts): client-side Supabase instance
- [`lib/supabase/server.ts`](/Users/harveyallen/Documents/Projects/SocOS/lib/supabase/server.ts): server-side Supabase instance using Next cookies
- [`lib/supabase/middleware.ts`](/Users/harveyallen/Documents/Projects/SocOS/lib/supabase/middleware.ts): session refresh + redirects
- [`middleware.ts`](/Users/harveyallen/Documents/Projects/SocOS/middleware.ts): activates middleware for app requests
- [`lib/supabase/queries.ts`](/Users/harveyallen/Documents/Projects/SocOS/lib/supabase/queries.ts): typed server query helpers

### Schema and types

- [`supabase/schema.sql`](/Users/harveyallen/Documents/Projects/SocOS/supabase/schema.sql): full SQL schema and policies
- [`types/database.ts`](/Users/harveyallen/Documents/Projects/SocOS/types/database.ts): source of truth for application-side table typing
- [`types/index.ts`](/Users/harveyallen/Documents/Projects/SocOS/types/index.ts): barrel exports and composite types

### Utilities

- [`utils/cn.ts`](/Users/harveyallen/Documents/Projects/SocOS/utils/cn.ts): class merging helper
- [`utils/format.ts`](/Users/harveyallen/Documents/Projects/SocOS/utils/format.ts): date/text formatting helpers
- [`hooks/use-mounted.ts`](/Users/harveyallen/Documents/Projects/SocOS/hooks/use-mounted.ts): tiny mount-state helper for future client components
- [`lib/org-context.tsx`](/Users/harveyallen/Documents/Projects/SocOS/lib/org-context.tsx): active organization context and persistence
- [`lib/org-state.ts`](/Users/harveyallen/Documents/Projects/SocOS/lib/org-state.ts): shared active-org constants and client-safe resolution helpers
- [`lib/org-server.ts`](/Users/harveyallen/Documents/Projects/SocOS/lib/org-server.ts): server-side active-org resolution via cookies

## Commands

```bash
npm install
npm run dev
npm run build
npm run start
npm run lint
```

## Known limitations of the current foundation

- The login page is not yet wired to a real Supabase auth form or OAuth provider buttons.
- The command menu navigates to section routes, but most non-meeting detail pages do not exist yet.
- There are no mutation helpers or server actions yet.
- There is no Supabase CLI project configuration or migration history yet.
- The service role key is prepared in envs but not yet used.
- Invites are stored as pending records only; email delivery is not implemented yet.
- Starter templates seed sample content, but there is no template management system yet.
- Meeting notes use a lightweight editor rather than a collaborative editor.

## Recommended next implementation steps

1. Add a real login/signup flow on `/login`.
2. Add invitation delivery and acceptance flows.
3. Replace the remaining route stubs with real CRUD pages for announcements, events, resources, handovers, and members.
4. Add schema migrations and local Supabase CLI support.
5. Add tests for auth flows, middleware, onboarding, task flows, meeting flows, org context persistence, and dashboard queries.
6. Add notification data, real search ranking, and richer analytics widgets.

## Keeping this README current

Whenever this repository changes, this README should be updated if any of the following are affected:

- setup steps
- environment variables
- routes
- auth flow
- database schema
- permissions or RLS behavior
- file structure
- developer commands
- deployment behavior

For future edits in this project, README maintenance should be treated as part of the definition of done.
