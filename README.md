# HYPED website

The public home for HYPED at the University of Edinburgh.

The application has five routes:

- `/` — homepage and member resources
- `/start` — new-member route; progress stays in the visitor's browser
- `/teams` — how HYPED's teams fit together
- `/people` — public people directory
- `/wiki` — a reader for the configured HYPED GitHub Wiki

There are no visitor accounts, memberships, invitations or private workspaces.
Editing the technical Wiki happens on GitHub. Firebase may provide
already-published homepage, onboarding, team, people and image content. The
homepage and onboarding guide have factual built-in content. Team and people
pages remain empty until current, consented data is published.

Approved committee Google accounts can sign in from the sidebar. They receive a
small `Change cover` control directly on each page banner; there is no separate
banner manager. Pages without an uploaded photo use the common branded banner.

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

The site works without Firebase. By default the Wiki reader uses
`Hyp-ed/hyped-2025`; set `HYPED_GITHUB_WIKI_REPOSITORY` to change it. To read an
existing Firebase project, copy `.env.example` to `.env.local` and provide the
server-side project and bucket values described in `docs/FIREBASE_SETUP.md`.

## Verify

```bash
npm run check
```
