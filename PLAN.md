# HYPED website plan

## Product boundary

This is one public website for HYPED, not a general society platform.

It should help a new or existing member answer five questions:

1. What is HYPED?
2. Where should I start?
3. How do the teams fit together?
4. Who should I ask?
5. Where is the technical knowledge?

## Sources of truth

- The technical Wiki is owned and edited on GitHub. The repository is selected
  with `HYPED_GITHUB_WIKI_REPOSITORY` and currently defaults to
  `Hyp-ed/hyped-2025`. This application changes its presentation and navigation,
  not its visible content.
- The other public pages can read published content from Firebase on the
  server. The homepage and onboarding guide have conservative built-in content.
  Team and people pages do not invent fallback records.
- New-member completion is deliberately local to each browser. It is a helpful
  checklist, not an account or monitoring system.

## Product rules

- No public application accounts, invitations, memberships or private areas.
- Approved editors may sign in only to manage page-cover images.
- No multi-society routing or society marketplace.
- No in-app Wiki editor, drafts, revisions or publishing workflow.
- No arbitrary themes; use the fixed HYPED palette.
- Keep the five public routes simple, readable and mobile-friendly.
- Link to an official destination only when its exact URL is known.

## Remaining work

- Complete the content in the GitHub Wiki.
- Publish current people only after confirming consent.
- Connect the production Firebase project only if the committee wants to keep
  non-Wiki public content there.
- Deploy through Firebase App Hosting and verify monitoring and rollback.
