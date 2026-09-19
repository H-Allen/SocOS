# HYPED Wiki

A public reader for HYPED's GitHub Wiki at the University of Edinburgh.

- `/` opens Wiki Home.
- `/wiki?page=Page-ID` opens a Wiki page. Existing Wiki links still work.
- The former `/start`, `/teams` and `/people` routes redirect to Wiki Home.

Page content, navigation and search results come from GitHub. Edit the source
Wiki on GitHub; there is no separate homepage, checklist or directory to maintain.

Every Wiki page has the default red-and-black banner. Approved Google accounts
can sign in below the sidebar links (or in the mobile header) and use `Change cover`
on a page to upload an image, adjust its crop or choose `Use default`. Images
and crop positions belong to individual Wiki pages. The former shared Wiki
banner, if present, is retained on Wiki Home only. Images stored for removed
standalone pages are not deleted or automatically reassigned.

Firebase handles banner storage, editor authentication and the shared production
Wiki cache. Public visitors never need an account. Local development can use
`.local-data` for banner settings and images without Firebase.

## Optional main pages above the Wiki

Put Markdown pages in a root-level folder named exactly `index` in the Wiki
repository. For example, these are file locations, not built-in placeholder pages:

```text
hyped-2027.wiki/
  index/
    Home.md
    People.md
    Onboarding.md
  Technical-Guides/
  boards/
  _Sidebar.md
```

Those pages appear as standalone links above the Wiki tree and are removed from
the tree itself. No `index/` folder, or a folder with no renderable Markdown
pages, means no extra navigation. Nested Markdown files under `index/` are
included; images, hidden files, `_Sidebar.md` and `_Footer.md` are not pages.

Home comes first, followed by the order/labels in the root `_Sidebar.md`.
Pages not listed there follow alphabetically. Links can use a page ID or a
Markdown path such as `index/People.md`. Keep page filenames unique across the
entire Wiki, regardless of folder or case: GitHub's Wiki page URLs are flat.
Move an existing `Home.md` rather than making a second copy under `index/`.
Ambiguous duplicate filenames are not promoted.

Page content still uses the existing Wiki renderer, including tables, images,
code, maths, page outlines and optional custom banners. Both groups participate
in search and the mobile page picker. URLs stay `/wiki?page=People`, so moving
a page between folders does not change its URL or its saved banner.

Commit and push changes to the Wiki's default branch to publish them. The local
`hyped-2027.wiki` clone is for authoring/reference, not a second runtime source;
uncommitted local pages are not served. Builds prepare a complete, sanitized
snapshot. Pages and search read that snapshot immediately; they do not wait for
GitHub. In production, one leased background worker refreshes it at most once
every five minutes and publishes it through Firebase. Other instances check
for updates once a minute. An incomplete refresh retains the last good content.
The worker reads the published Git tree using a shallow, no-checkout cache in
temporary storage, without modifying the authoring clone or requiring native
Git. See [production deployment](docs/FIREBASE_SETUP.md) for cache prerequisites,
freshness tradeoffs and verification.

GitHub's [Wiki editing guide](https://docs.github.com/en/communities/documenting-your-project-with-wikis/adding-or-editing-wiki-pages)
describes publishing local Wiki changes.

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

The site works without Firebase. By default the Wiki reader uses
`Hyp-ed/hyped-2027`; set `HYPED_GITHUB_WIKI_REPOSITORY` at both build and runtime
and run `npm run wiki:prepare` to change it. To read an
existing Firebase project, copy `.env.example` to `.env.local` and provide the
server-side project and bucket values described in `docs/FIREBASE_SETUP.md`.

Set `HYPED_SITE_URL` to this application's public origin when deploying behind a
proxy that supplies an internal host. Otherwise, social preview image URLs use
the request's origin. The app supplies its own favicon and HYPED preview image.

## Verify

```bash
npm run check
```

`npm run build` prepares Wiki content automatically. Keep
`src/generated/wiki-snapshot.json` in version control: it is the public-content
baseline used when GitHub is unavailable during a build. Refresh it explicitly
with `npm run wiki:prepare` (export any repository override in the shell).

For a local production-mode HTTP load smoke test, run `npm start -- --port 3100`
after building, then `node scripts/benchmark-local.mjs`. This sends 600 requests
with 200 concurrent workers to loopback only; it is not a cloud capacity test.
