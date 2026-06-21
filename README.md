# SocietyOS

SocietyOS is a multi-tenant SaaS app for university societies. It gives each society a secure workspace for committee operations: members, tasks, meetings, notes, resources, handovers, announcements, events, and activity logs.

The app now uses Firebase as its backend.

## Stack

- Next.js 14 with the App Router
- React 18
- TypeScript
- Tailwind CSS
- Firebase Auth
- Firestore
- Firebase Storage
- Firebase Admin SDK for server-side session verification and privileged writes
- `react-hook-form`, `zod`, and `@hookform/resolvers`
- `@hello-pangea/dnd`
- `@tanstack/react-table`
- `react-big-calendar`
- `react-simple-wysiwyg`

## App Structure

```text
SocOS/
├── app/
│   ├── (app)/                 # authenticated product routes
│   ├── api/auth/session/      # Firebase ID token to HttpOnly session cookie
│   ├── login/
│   ├── onboarding/
│   ├── reset-password/
│   └── page.tsx               # marketing page
├── components/
├── firebase/
│   ├── firestore.rules
│   └── storage.rules
├── lib/
│   ├── backend/               # app-facing backend helpers
│   ├── firebase/              # Firebase client/admin/session/query implementation
│   └── org-*.ts
├── types/
├── utils/
├── firebase.json
└── .env.local.example
```

## Backend Model

Firestore uses top-level collections:

- `users`
- `organizations`
- `memberships`
- `organization_roles`
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

Membership document IDs use:

```text
{organizationId}_{userId}
```

That shape is intentional because the Firestore and Storage rules use it to verify organization membership.

## Authentication

Browser sign-in uses Firebase Auth. After sign-in or sign-up, the client sends the Firebase ID token to:

```text
POST /api/auth/session
```

The server verifies the ID token with Firebase Admin and creates a secure HttpOnly `__session` cookie. Protected server-rendered pages verify that cookie before reading Firestore.

Sign-out clears both Firebase browser auth and the server session cookie.

## Setup

Use [FIREBASE_SETUP.md](/Users/harveyallen/Documents/Projects/SocOS/FIREBASE_SETUP.md) for the full Firebase console walkthrough.

Quick local setup:

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Then fill `.env.local` with your Firebase web config and Admin SDK service account values.

## Rules

Rules live in:

- [firebase/firestore.rules](/Users/harveyallen/Documents/Projects/SocOS/firebase/firestore.rules)
- [firebase/storage.rules](/Users/harveyallen/Documents/Projects/SocOS/firebase/storage.rules)

Deploy with the Firebase CLI:

```bash
firebase login
firebase use --add
firebase deploy --only firestore:rules,storage
```

## Development

Run the app:

```bash
npm run dev
```

Build the app:

```bash
npm run build
```

## Notes

- Invite records are stored in Firestore and accepted automatically when someone signs in with the invited email address.
- Branded invite email delivery should be implemented with Firebase Functions and an email provider such as Resend, SendGrid, or Postmark.
- The app-facing backend helpers live under `lib/backend`; Firebase-specific implementation lives under `lib/firebase`.
