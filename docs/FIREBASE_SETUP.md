# Optional Firebase banner storage

GitHub is the only page-content source. Firebase is optional for banner images,
per-page crop positions and approved-editor authentication.

The server uses:

- `societies/hyped/site/settings` for banner paths and positions, keyed by encoded Wiki page ID
- `societies/hyped/public/banners/*` in Cloud Storage

Former homepage, onboarding, team and profile documents are no longer read.
Existing documents and images are not deleted by this change. A legacy shared
`wiki` banner is read as the Wiki Home banner; replacing or removing it migrates
that page without changing other Wiki pages.

When Firestore/Storage are not configured, settings and images use `.local-data`.
This local fallback needs a persistent writable disk and is not a replacement
for production cloud storage on ephemeral hosts. Authentication still requires Firebase.

Public visitors cannot write data. Approved editors authenticate with Google;
the server verifies their Firebase ID token, issues an HTTP-only session cookie
and checks the approved email list again for every banner change. Firebase App
Hosting supplies Application Default Credentials and web-app configuration in
production.

For local banner storage and editor authentication, copy `.env.example` to `.env.local` and set:

```dotenv
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
HYPED_EDITOR_EMAILS=first.editor@example.com,second.editor@example.com
FIREBASE_WEB_API_KEY=your-web-api-key
FIREBASE_WEB_APP_ID=your-web-app-id
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
```

In Firebase Console, enable **Authentication > Sign-in method > Google** and add
the local and hosted domains under **Authentication > Settings > Authorized
domains**. Add `HYPED_EDITOR_EMAILS` as a runtime environment variable in App
Hosting; use exact, comma-separated Google account addresses. App Hosting
provides `FIREBASE_WEBAPP_CONFIG` automatically. Local development instead uses
the three web-app values above from **Project settings > Your apps**.

Successful sign-in creates a secure, HTTP-only, same-site editor cookie lasting
five days. Banner uploads accept JPG, PNG and WebP files up to 6 MB.

Never add service-account JSON or private keys to the repository. If banner settings cannot be read, the default banner is shown. Failed edits
report an error; a configured but unavailable cloud service does not silently
switch writes to local storage.
