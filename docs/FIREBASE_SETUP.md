# Firebase production setup

GitHub remains the only page-content source. Firebase stores editor sessions,
banner settings and the shared, read-only copy of published Wiki content.

## Fix the current sign-in failure

The deployed site was checked on 18 September 2026. Its auth-config endpoint
returned valid Web SDK configuration, but clicking Sign in produced
`auth/unauthorized-domain`.

In project **socos-d7ea6**, open **Authentication → Settings → Authorized domains**
and add exactly:

```text
socos-web--socos-d7ea6.europe-west4.hosted.app
```

Use a hostname, not a URL or wildcard. Add future custom domains separately.
Ensure **Authentication → Sign-in method → Google** is enabled. This setting
cannot be repaired by shipping JavaScript or changing the app's `authDomain`.
Then sign in with an email in runtime `HYPED_EDITOR_EMAILS` and test a cover edit.
The browser-side OAuth flow and server-side session issuance both need to pass.

App Hosting supplies `FIREBASE_WEBAPP_CONFIG` at **build time**, provided the backend
is linked to a Firebase Web App. `next.config.ts` embeds only validated, public
Web SDK fields; it never embeds Admin credentials. The auth-config route can
also use explicit runtime Web SDK variables. See
[App Hosting configuration](https://firebase.google.com/docs/app-hosting/configure)
and [Google sign-in](https://firebase.google.com/docs/auth/web/google-signin).

## Required production services and permissions

Provision Firestore's default database and the project's Cloud Storage bucket.
The App Hosting runtime service account needs access through IAM to:

- Firestore `wikiCache/*`: read and transactional writes for the refresh lease and pointer.
- Storage `wiki-cache/v1/*`: read and create/overwrite compressed snapshots.
- Firestore `societies/hyped/site/settings`: read and editor-authorized updates.
- Storage `societies/hyped/public/banners/*`: existing banner operations.
- Firebase Authentication: verify users and create session cookies.

Use Application Default Credentials supplied by App Hosting, not checked-in
service-account keys. Keep these cache paths inaccessible to untrusted client
writes. Do **not** relax Firestore or Storage client rules to fix an Admin SDK
permission error; Admin access is controlled by IAM. Confirm the actual runtime
service account and its existing roles before changing grants.

`FIREBASE_CONFIG` supplies Admin configuration at runtime. If overriding it with
`FIREBASE_PROJECT_ID` or `FIREBASE_STORAGE_BUCKET`, ensure both identify the same
project/bucket. Local `.env.local` values are not production configuration.

## Read and refresh architecture

1. `npm run build` prepares all public Wiki pages, sanitizes HTML, renders maths,
   and includes `src/generated/wiki-snapshot.json` in the build. GitHub failure
   retains the validated baseline, never a partial snapshot.
2. Each server starts with this baseline. Page and search reads use memory, not
   live GitHub calls. Session verification stays per request and is never stored
   in the public snapshot.
3. Next.js `after()` schedules maintenance after the response. Each instance
   checks the shared pointer at most once a minute; concurrent requests share
   one task. A Firestore transaction grants one fleet-wide, 120-second lease.
4. Only the lease holder fetches GitHub, with four page requests in flight and
   a 90-second deadline. Complete results are compressed into Storage before
   atomically publishing the pointer. Expired workers cannot publish. Identical
   content reuses its blob; freshness lives in the Firestore pointer.
5. Successful refreshes are spaced five minutes apart. Failures retain content
   and allow a retry after a minute. Other instances adopt the new snapshot on
   their next background check. A missing blob can be repaired by the next
   lease holder. Missing production cache configuration serves the baseline
   without falling back to independent GitHub downloads on every instance.

Under sustained traffic, updates normally appear within roughly six minutes
plus fetch time. A new instance's first response can show the build baseline
until its background check finishes. With no traffic, refreshes stop. This is
deliberate stale-while-refresh behaviour, not immediate publishing.
The framework adapter must support Next.js `after()`/request-lifetime work;
verify advancing health timestamps after deployment.

Banner settings have a 30-second per-instance cache, coalesced reads and a
1.5-second timeout. Failed reads retain previous settings or the default banner.
Writes invalidate the local cache; other instances see edits within 30 seconds.
Failed configured-cloud writes never silently switch to ephemeral local storage.
The default image is a hashed Next.js build asset under `/_next/static/media/`.

Old changed-content blobs can be pruned using a bucket lifecycle rule scoped
**only** to `wiki-cache/v1/`, for example after 30 days. Never apply this to banner
uploads. An active unchanged snapshot is overwritten on successful refresh;
after prolonged inactivity an expired blob is regenerated under the lease,
while the build baseline remains available. No lifecycle rule is installed by
the application; confirm retention requirements before enabling one.

## Optional scheduled refresh

To keep content warm without visitors, configure runtime `HYPED_WIKI_SYNC_SECRET`
as a Secret Manager secret of at least 32 random characters. A trusted scheduler
can POST to `/api/internal/wiki-sync` with `Authorization: Bearer <secret>` every
five minutes. Never place the secret in a URL. Without the secret the endpoint
is disabled. It shares the same lease and cannot bypass refresh rate limits.
No scheduler, new IAM grant, or secret is created automatically.

## Deployment verification and scaling

- Run `npm run check`, then roll out the changed repository with App Hosting.
- Verify the banner's hashed image URL returns 200 with an image content type.
- Test cold page loads, subsequent navigation, search, a missing page, and an
  approved editor's sign-in, upload, crop and sign-out.
- `/api/health` is uncached and reports this instance's Wiki freshness and last
  refresh failure. Its HTTP 200 means the reader is serving, not that GitHub or
  every cloud dependency is healthy. Monitor `wiki.ageSeconds`, `wiki.lastError`
  and `[wiki-cache]` logs. Alert on sustained staleness, e.g. over 15 minutes
  under traffic, allowing for a new instance's first check.
- Run a staging load test at the desired traffic profile and examine p95 latency,
  errors, memory, cold starts, instance count and cloud costs. Unit concurrency
  tests and a laptop HTTP benchmark do not certify Firebase capacity.

The existing limits remain 20 instances, concurrency 80, one CPU, 512 MiB, and
zero minimum instances. These are autoscaling limits, not a guarantee of 1,600
fast simultaneous requests. Increase memory/instance caps based on staging
measurements. A minimum instance can reduce idle cold starts but incurs ongoing
cost; it has not been enabled by this change. For much larger traffic, consider
a separate scheduled sync worker and CDN-cacheable anonymous rendering while
keeping editor sessions private.

## Local development

Copy `.env.example` to `.env.local`. Without Firebase, banner settings and images
use `.local-data`; this is not production storage. Set explicit public Web SDK
values from **Project settings → Your apps**, plus `HYPED_EDITOR_EMAILS` for editors.
Add localhost as an authorized domain when testing sign-in. Local emulators must
be running if their endpoint variables are set.

Google sign-in issues an HTTP-only, same-site editor session lasting five days.
Each edit rechecks the verified email allowlist. Banner uploads accept JPG, PNG
and WebP files up to 6 MB. Former homepage/team/profile documents are untouched.
A legacy `wiki` banner maps to Wiki Home only.
