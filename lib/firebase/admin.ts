import { getApps, initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function clean(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, "") ?? "";
}

function getPrivateKey() {
  return clean(process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, "\n");
}

const projectId = clean(process.env.FIREBASE_PROJECT_ID) || clean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
const clientEmail = clean(process.env.FIREBASE_CLIENT_EMAIL);
const privateKey = getPrivateKey();
const storageBucket = clean(process.env.FIREBASE_STORAGE_BUCKET) || clean(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);

const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: projectId && clientEmail && privateKey
        ? cert({ projectId, clientEmail, privateKey })
        : applicationDefault(),
      projectId,
      storageBucket
    });

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminStorage = getStorage(app);
