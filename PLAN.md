# HYPED Wiki product boundary

The website is a reader for HYPED's GitHub Wiki, not a separate member portal.

## Sources of truth

- GitHub supplies page content, titles, navigation and search documents.
- `HYPED_GITHUB_WIKI_REPOSITORY` selects the Wiki; the default is `Hyp-ed/hyped-2027`.
- Optional per-page banner images and crop positions live in Firebase or local storage.
- Wiki text is edited on GitHub. The application sanitises and presents it without inventing content.

## Product rules

- The root opens Wiki Home. Existing `/wiki?page=...` links remain valid.
- Removed standalone routes redirect to the Wiki; no duplicate Home, Start, Teams or People content.
- A published root `index/` directory in the Wiki optionally supplies standalone links above the Wiki tree. These pages still use the same renderer, search, URLs and banners; no folder means no extra section.
- Every Wiki page has the default red-and-black banner unless an editor uploads a custom image.
- Approved editors can upload, reposition and remove individual page banners.
- No visitor accounts, memberships, private workspaces or in-app Wiki editor.
- Keep navigation, search and reading accessible on desktop and mobile.

## Remaining work

- Maintain content in the GitHub Wiki.
- Configure approved banner editors and production image storage if desired.
- Deploy and verify production authentication, monitoring and rollback.
