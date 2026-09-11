# Optional Firebase content source

Firebase is not required to run the HYPED website. The homepage and onboarding
guide have built-in content; teams and people are shown only when published.

When configured, the server reads published content from these locations:

- `societies/hyped/homepages/published`
- `societies/hyped/onboarding/guide`
- `societies/hyped/teams/*`
- `societies/hyped/publicProfiles/*`
- `societies/hyped/site/settings` for optional page-banner paths
- `societies/hyped/public/homepage/*` in Cloud Storage
- `societies/hyped/public/banners/*` in Cloud Storage

Public visitors cannot write data. Approved editors authenticate with Google;
the server verifies their Firebase ID token, issues an HTTP-only session cookie
and checks the approved email list again for every banner change. Firebase App
Hosting supplies Application Default Credentials and web-app configuration in
production.

For local server-side reads, copy `.env.example` to `.env.local` and set:

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

Never add service-account JSON or private keys to the repository. If the
credentials or services are unavailable, the site falls back automatically.
