# Firebase setup for SocietyOS

This app now uses Firebase for the full backend:

- Firebase Auth for email/password authentication
- Firestore for application data
- Firebase Storage for logos and resource uploads
- Firebase Admin SDK on the server for secure session verification and server-side reads/writes

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com.
2. Click **Add project**.
3. Name it something like `SocietyOS`.
4. Google Analytics is optional for local development.
5. Open the project once it has been created.

## 2. Add a web app

1. In the Firebase console, click the web icon: `</>`.
2. Register the app as `SocietyOS Web`.
3. You do not need Firebase Hosting yet.
4. Copy the generated Firebase config.

Put those values into `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## 3. Enable Firebase Auth

1. Go to **Build > Authentication**.
2. Click **Get started**.
3. Open **Sign-in method**.
4. Enable **Email/Password**.
5. Optional but recommended: enable **Email link** later if you want passwordless invites.

For local development, add these authorized domains if they are not already present:

- `localhost`
- Your deployed domain, once you have one

## 4. Create Firestore

1. Go to **Build > Firestore Database**.
2. Click **Create database**.
3. Choose **Production mode**.
4. Pick the closest region to your users.
5. Deploy the repo rules from `firebase/firestore.rules`.

If you have the Firebase CLI installed:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules
```

Select your SocietyOS Firebase project when prompted.

## 5. Create Firebase Storage

1. Go to **Build > Storage**.
2. Click **Get started**.
3. Choose production mode.
4. Use the same region as Firestore where possible.
5. Deploy the repo rules from `firebase/storage.rules`.

With the Firebase CLI:

```bash
firebase deploy --only storage
```

## 6. Create a service account for server-side access

The Next.js server needs Firebase Admin credentials to verify session cookies and perform server-side database reads/writes.

1. Go to **Project settings**.
2. Open **Service accounts**.
3. Click **Generate new private key**.
4. Download the JSON file.
5. Copy these fields into `.env.local`:

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

Keep `FIREBASE_PRIVATE_KEY` quoted. If you paste it as one line, keep the `\n` characters exactly as Firebase gives them or as your deployment platform requires.

## 7. Run the app locally

Install dependencies if needed:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Open http://localhost:3000.

Create an account from `/login`, then complete onboarding. The app will create:

- A `users/{uid}` document
- An `organizations/{orgId}` document
- A `memberships/{orgId}_{uid}` document
- Starter tasks, meetings, handovers, announcements, and activity logs if you choose a template

## 8. Data model overview

SocietyOS stores app data in top-level Firestore collections:

- `users`
- `organizations`
- `memberships`
- `organization_roles`
- `tasks`
- `meetings`
- `meeting_notes`
- `meeting_attendees`
- `meeting_agenda_items`
- `resources`
- `handovers`
- `announcements`
- `events`
- `activity_logs`
- `invites`

Membership document IDs are intentionally shaped as:

```text
{organizationId}_{userId}
```

That lets Firestore and Storage rules verify organization membership efficiently.

## 9. Invite emails

The app now creates pending invite records and accepts them automatically when someone signs in with the invited email address.

Actual branded invite email delivery should be added with Firebase Functions, using an email provider such as Resend, SendGrid, or Postmark. The future function can listen for new `invites` documents where `status == "pending"` and send the invite email.

## 10. Production checklist

- Set all Firebase env vars in your deployment platform.
- Add your production domain to Firebase Auth authorized domains.
- Deploy Firestore and Storage rules.
- Confirm Email/Password auth is enabled.
- Consider enabling App Check before launch.
- Add Firebase Functions for invite emails and any privileged workflows that should not run in the browser.
