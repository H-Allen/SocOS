import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

function clean(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, "") ?? "";
}

const firebaseConfig = {
  apiKey: clean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY) || "demo-api-key",
  authDomain: clean(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) || "demo.firebaseapp.com",
  projectId: clean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) || "demo-project",
  storageBucket: clean(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) || "demo-project.appspot.com",
  messagingSenderId: clean(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) || "000000000000",
  appId: clean(process.env.NEXT_PUBLIC_FIREBASE_APP_ID) || "1:000000000000:web:0000000000000000000000"
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDb = getFirestore(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);
