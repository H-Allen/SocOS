# Design and implementation audit

Audited 11 September 2026 against the supplied checklist. Scope: repository source, the five public routes, responsive navigation, search, onboarding, metadata and generated assets. These are quality findings, not claims about who wrote the code.

## 15 September: Wiki-only update requested by the user

Optional Wiki-owned main pages:

- **Changed:** a published root `index/` directory supplies a separate navigation group above Wiki. Its Markdown pages are removed from the technical tree, but use the same page renderer, URLs, search and custom banners.
- **Changed:** no folder or no eligible Markdown pages means no additional navigation. Home comes first; root sidebar labels/order are retained. Unlisted pages are included, and duplicate filenames are not guessed.
- **Changed:** mobile navigation groups main pages separately from the Wiki. Sidebar labels use 15px system text, higher contrast and wrapping instead of truncation.
- **Changed:** published repository paths are read using an isolated shallow Git cache, with a timeout, concurrent-request sharing and a 60-second refresh interval. The user's local Wiki clone is untouched.
- **Verified:** 55 tests cover folder presence/absence, removal, duplicate filenames, omitted page-list entries, cache/retry behaviour and rendered desktop/mobile navigation groups. Live browser checks confirm the absent-folder state, readable expanded labels and no width overflow at 320px.
- **Verification cleanup:** recurring duplicate generated Next type files ending in ` 2.ts` were moved to `/tmp/hyped-wiki-types.5GtbfZ/` before rerunning the full check. They are recoverable; the authoring Wiki clone was not changed.
- **Flagged:** existing Next.js/sharp dependency advisories are recorded in `SECURITY_NOTES.md`; the navigation change does not upgrade those packages.

Follow-up header refinements:

- **Changed:** sidebar disclosure arrows and labels share a single row-level hover, focus and active background. The sidebar heading is now just Wiki.
- **Changed:** approved signed-in accounts display the verified session's profile photo beside Sign out, with an initial fallback for missing or failed images. Approval checks remain unchanged.
- **Changed:** replaced the generated initial favicon with the exact user-supplied red HYPED mark in `app/icon.png`.
- **Verified:** hovering either the arrow or label produces the same row background with transparent child controls; directory toggling still works. The rendered favicon link points to the supplied PNG and its checksum matches the attachment. Lint, TypeScript, 41 tests and production build pass. Profile extraction is covered by mocked session tests; a live account photo was not exercised.
- **Changed:** minimal Sign in/Sign out controls; desktop sign-in sits below the external links. Mobile uses the same direct control.
- **Changed:** removed the banner label, live-source badge, source attribution row and repeated documentation eyebrow from page chrome.
- **Changed:** compact page details show a valid last-updated date when available and an estimated reading time derived from page text. Missing dates are omitted rather than replaced with filler.
- **Changed:** search displays ⌘ K and exposes both Command-K and Control-K as accessible shortcuts.
- **Changed:** the sidebar logo fills its available width; header spacing is tighter. Default and custom banner behaviour is unchanged.
- **Verified:** desktop appearance, 320px mobile width without overflow, and Command-K opening search. Lint, type checks, 31 tests and production build pass.

- **Changed:** restored the original red-and-black diagonal default banner on every Wiki page.
- **Changed:** custom images and crop positions are now per Wiki page, with a `Use default` action.
- **Changed:** the root renders Wiki Home. Removed the standalone Home, Start, Teams and People implementations, content readers, schemas and unused styles. Old secondary routes redirect to the root.
- **Changed:** sidebar navigation, search shortcuts and search results use only the GitHub Wiki. Removed the locally authored new-member callout.
- **Changed:** added mobile editor access and updated metadata and product documentation to describe the Wiki.
- **Preserved:** existing stored images and former Firebase content were not bulk-deleted. A shared Wiki banner migrates to Wiki Home only.

Verification for this update: `npm run check` passes (lint, TypeScript, 31 tests
across five files, production build), as does `git diff --check`. Browser checks
confirmed Wiki Home, Wiki-only search, navigation to a full article, the default
banner on multiple pages, mobile editor access and no document overflow at
320px. The three retired routes return 308 redirects to `/`. Banner migration,
per-page image/crop isolation, removal and API authorization were tested with
mocked storage/authentication; a real authenticated upload was not performed.
No undefined CSS-module references remain.

Four duplicate generated type files with ` 2` suffixes were moved to
`/tmp/hyped-types.MSYQ09/` and route types regenerated after the route removal.
They are recoverable; no saved content or banner files were removed.

The original audit below is historical. Its no-banner recommendation and
standalone-page findings are superseded by this requested product change.

## Occurrences changed

| Occurrence | Status and change | Location |
| --- | --- | --- |
| Repeated diagonal gradient banners when no image exists | **Changed.** Removed. Public pages without a photo start with their heading; editors retain a compact upload control. | `society.module.css`, `society-document.tsx`, `home-page.tsx` |
| Gradient overlays on uploaded photos | **Changed.** Photos render without gradient overlays. Cover labels use a solid dark background for contrast. | `society-document.tsx`, `home-page.tsx` |
| Oversized 68px headings and tight line height | **Changed.** Main headings now scale from 32–48px with a 1.15 line height; mobile headings are 34px. | `society.module.css` |
| Repeated homepage icon cards with “This site” filler | **Changed.** Replaced with a semantic list of resource links. | `home-page.tsx` |
| Three-column team icon cards, decorative numbers and connection counts | **Changed.** Replaced with compact team rows showing responsibilities and a public lead when available. Removed decorative icons from related-team links. | `teams-page.tsx`, `society.module.css` |
| Arbitrary purple, blue, pink and other avatar colours | **Changed.** Missing photos use neutral initials. | `public-people-page.tsx` |
| Repeated directory metric cards and generic closing callout | **Changed.** Removed redundant profile/team/skill counters and the promotional “who owns something” block. | `public-people-page.tsx` |
| Decorative progress dial, duplicate outcome box and repeated “Why it matters” panels | **Changed.** Replaced with a native labelled progress element and direct checklist instructions. | `onboarding-journey.tsx`, `onboarding.ts` |
| Generic copy such as “You’ve got the foundations”, “Find the right place” and “Searches this society only” | **Changed.** Replaced with specific checklist, resource and search labels. | `onboarding-journey.tsx`, `homepage.ts`, `society-search.tsx` |
| Empty-state copy describing publishing internals; unsupported claim that the committee has not named a lead | **Changed.** Empty states explain what is unavailable and link to the official HYPED website or Wiki. Missing leads are described as not publicly listed. | `public-people-page.tsx`, `teams-page.tsx` |
| Unsupported “Refresh every minute” wording | **Changed.** Removed: the implementation uses a cache revalidation interval, not a guaranteed background refresh schedule. | `github-wiki-page.tsx` |
| Random 3–9px radii and heavy modal shadows | **Changed.** Controls use a 4px radius and panels 6px; modal shadows were removed. Circular avatars remain intentional. | `society.module.css` |
| 10–11px UI labels and low-contrast counters/source labels | **Changed.** Small UI text is at least 12px. Light counters and the dark sidebar source label were darkened/lightened respectively. | `society.module.css` |
| Focus outline suppressed on search input | **Changed.** Removed the override so the global focus indicator applies. | `society.module.css` |
| Search and profile overlays without complete keyboard behaviour | **Changed.** Both use a shared native modal dialog, explicit Tab wrapping, Escape dismissal, focus restoration and background scroll locking. | `modal.tsx`, `society-search.tsx`, `public-people-page.tsx` |
| Missing accessible state on navigation and toggles | **Changed.** Added current-page markers, pressed states for filters/team/checklist controls, expanded states for Wiki directories, and a focusable skip-link target. Search now exposes combobox/listbox relationships. | `society-shell.tsx`, `society-search.tsx`, `public-people-page.tsx`, `teams-page.tsx`, `onboarding-journey.tsx` |
| No direct mobile Wiki link and cramped mobile navigation | **Changed.** All four secondary routes fit in a two-row header on narrow screens. | `society-shell.tsx`, `society.module.css` |
| No route-loading or application error UI | **Changed.** Added an announced loading state with static skeletons and a branded error view with retry/navigation actions. | `app/loading.tsx`, `app/error.tsx` |
| Search failure requires closing and reopening; generic loading copy | **Changed.** Added an explicit retry action and announced loading, failure and empty states. | `society-search.tsx` |
| Clipboard failures are silent | **Changed.** Added a failure explanation and a success announcement. | `github-wiki-actions.tsx` |
| Sign-out ignores failed responses; failed auth initialization stays cached | **Changed.** Sign-out checks the response and displays errors. Failed initialization clears its promise so a later attempt can retry. Removed the improvised Google “G” mark. | `editor-auth-control.tsx`, `firebase/client.ts` |
| Cover changes lack explicit success messages | **Changed.** Upload, removal and repositioning now announce completion. Existing busy/error states remain. | `banner-editor.tsx` |
| Checklist crashes when browser storage is blocked | **Changed.** Storage reads/writes/removal are guarded; the checklist remains usable and explains when progress cannot be saved. Controls wait for initial progress loading. | `onboarding-journey.tsx` |
| Forced smooth scrolling disregards reduced-motion preference and triggers Next warnings | **Changed.** Removed forced smooth scrolling; reduced-motion styles also cover animation and transitions. | `globals.css`, `teams-page.tsx` |
| Missing favicon and social-preview artwork | **Changed.** Added a custom HYPED initial favicon and a 1200×630 preview using the existing HYPED logo. | `app/icon.svg`, `app/opengraph-image.tsx` |
| Generic inherited descriptions and missing OG/Twitter metadata | **Changed.** Every route has a specific title/description and preview image. Wiki titles reflect the selected page. Image URLs use the request origin or `HYPED_SITE_URL`. | `page-metadata.ts`, `app/layout.tsx`, route files |
| Stock 404 and silently falling back to Wiki Home for invalid page IDs | **Changed.** Added a HYPED 404 with working navigation. Unknown Wiki IDs display that view and receive `noindex`. | `app/not-found.tsx`, `app/wiki/page.tsx` |
| Archived Wiki links incorrectly lead to the current Wiki; section fragments are discarded | **Changed.** Only links within the selected repository are rewritten. Archive destinations and fragments are preserved. | `github-wiki.server.ts`, `github-wiki.test.ts` |
| Duplicate page-selector keys when the sidebar links to a page twice | **Changed.** Selector entries are deduplicated by page ID and the selected value follows navigation. | `github-wiki-page.tsx`, `github-wiki-actions.tsx` |
| Two top-level headings on imported Wiki pages | **Changed.** Imported headings are shifted down one level when the source contains an H1; source wording and anchor IDs are preserved. | `github-wiki-page.tsx` |
| Wiki requests have no explicit time limit | **Changed.** Index, sidebar and page requests have 10-second timeouts; existing unavailable/partial states handle failures. | `github-wiki.server.ts` |
| Homepage URL validation accepts malformed HTTPS and protocol-relative destinations | **Changed.** Rejects invalid URLs, credentials, whitespace, backslashes, insecure protocols and `//` destinations. | `links.ts`, `homepage.ts`, `links.test.ts` |
| Consent is present in profile data but not enforced by the reader | **Changed.** Public profiles require confirmed consent as well as published visibility; a regression test covers hidden, malformed and unconsented records. | `public-profiles.server.ts`, `published-profiles.test.ts` |
| Stale Wiki-year and placeholder-banner documentation | **Changed.** README, plan and environment example now match the existing `hyped-2027` default and the new no-photo layout. | `README.md`, `PLAN.md`, `.env.example` |

## Checklist items not found

No occurrences were found in application source/assets of purple/blue/pink gradient heroes, glowing blobs, glassmorphism, gradient headline text, fake testimonials, unverified “trusted by” badges, pricing/FAQ/testimonial template sequences, sparkle/rocket headings, Lorem ipsum, company/product placeholders, builder credits, Lovable/Bolt/Replit scripts, Framer/Webflow class patterns, Tailwind utility soup, or production branding links to builder subdomains.

There were no scaffold page titles or default framework favicon files; the favicon was missing entirely. Authored application copy did not show excessive em dashes. Native input placeholders, empty image alt text next to an already-labelled logo/person, technical Wiki code examples, GitHub alert classes, and required Next-generated files were retained where they serve a purpose. Framework runtime assets and the development-only Next toolbar are not builder credits.

The existing Firebase project identifier was preserved. No hosting or production-domain configuration was changed. Current member/team records were not invented or seeded. The remote GitHub Wiki remains the source of its own text.

## Verification

- `npm run check`: ESLint, TypeScript, 36 unit tests across eight files, and Next 16 production build pass.
- `git diff --check` passes.
- Desktop homepage and social-preview image visually inspected. Mobile checklist/directory/Wiki inspected at 390px and 320px; no document-width overflow in checked views.
- Search loading/results, keyboard containment, Escape dismissal and focus restoration verified in the browser.
- Checklist completion persisted across reload; test progress was reset to its original zero state.
- Mobile Wiki navigation, page selection and clipboard success feedback verified.
- HTTP checks confirmed specific metadata and OG/Twitter image URLs on all five routes. The favicon and preview image returned 200 with the expected SVG/PNG media types.
- An unmatched route returns HTTP 404 with a single branded title and `noindex`. A missing Wiki query renders the branded missing-page UI and `noindex`; because the route streams, its HTTP response can already be 200.
- Source checks found no undefined CSS module class references or application `href="#"` placeholders. The checked rendered pages had no images missing an alt attribute.

Authenticated cover uploads/removal and Google account sign-in/sign-out were reviewed in code but not exercised against an editor account. Populated team/profile views were reviewed in code; the current data source provided empty directories. Browser checks do not constitute a complete screen-reader or accessibility certification.

Four duplicate Next-generated type files with ` 2` suffixes were moved out of `.next/types` to `/tmp/hyped-generated-types.rSLoK8/` because they caused duplicate TypeScript declarations. They remain recoverable there; application source was not removed.

The supplied [CheckVibe checklist](https://checkvibe.dev/blog/how-to-tell-if-a-website-is-vibe-coded) and other linked examples were used as inspection prompts. Findings above are supported by this repository and local verification, not by a detector score.
