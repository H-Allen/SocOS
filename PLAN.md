# HYPED website plan

## Product boundary

This is one public website for HYPED, not a general society platform.

It should help a new or existing member answer five questions:

1. What is happening in HYPED?
2. Where should I start?
3. How do the teams fit together?
4. Who should I ask?
5. Where is the technical knowledge?

## Sources of truth

- The technical Wiki is owned and edited in the
  `Hyp-ed/hyped-2027.wiki` GitHub repository. This application changes its
  presentation and navigation, not its visible content.
- The other public pages can read published content from Firebase on the
  server. Built-in HYPED content keeps the site available when Firebase has no
  document or cannot be reached.
- New-member completion is deliberately local to each browser. It is a helpful
  checklist, not an account or monitoring system.

## Product rules

- No application accounts, sign-in, invitations, memberships or permissions.
- No multi-society routing or society marketplace.
- No in-app Wiki editor, drafts, revisions or publishing workflow.
- No arbitrary themes; use the fixed HYPED workshop palette.
- Keep the five public routes simple, readable and mobile-friendly.
- Prefer links to Discord, GitHub and Drive over rebuilding those tools.

## Remaining work

- Replace placeholder homepage events and links with current HYPED details.
- Complete the content in the GitHub Wiki.
- Confirm the public people list and consent before launch.
- Connect the production Firebase project only if the committee wants to keep
  non-Wiki public content there.
- Deploy through Firebase App Hosting and verify monitoring and rollback.

