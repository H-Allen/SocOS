# HYPED website

The public home for HYPED at the University of Edinburgh.

The application has five routes:

- `/` — homepage and current announcements
- `/start` — new-member route; progress stays in the visitor's browser
- `/teams` — how HYPED's teams fit together
- `/people` — public people directory
- `/wiki` — a styled reader for the HYPED 2027 GitHub Wiki

There are no public SocOS accounts, memberships, invitations or private workspaces.
Editing the technical Wiki happens on GitHub. Firebase may
provide already-published homepage, onboarding, team, people and image content.
Every public page has a built-in HYPED fallback if Firebase is empty or offline.

Approved committee Google accounts can sign in from the sidebar. They receive a
small `Change cover` control directly on each page banner; there is no separate
banner manager. Pages without an uploaded photo use the common branded banner.

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

The site works without Firebase. To read an existing Firebase project, copy
`.env.example` to `.env.local` and provide the server-side project and bucket
values described in `docs/FIREBASE_SETUP.md`.

## Verify

```bash
npm run check
```
