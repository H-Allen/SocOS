import "server-only";

import {
  getApp,
  getApps,
  initializeApp,
  type App,
  type AppOptions,
} from "firebase-admin/app";
import { existsSync } from "node:fs";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getAuth } from "firebase-admin/auth";

export function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const options: AppOptions = {};
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (projectId) {
    options.projectId = projectId;
  }

  if (process.env.FIREBASE_STORAGE_BUCKET) {
    options.storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  }

  // App Hosting supplies Application Default Credentials and FIREBASE_CONFIG.
  // Local emulators only need the explicit demo project ID.
  return Object.keys(options).length > 0 ? initializeApp(options) : initializeApp();
}

export function getAdminFirestore() {
  if (!firebaseFirestoreAvailable()) throw new Error("Firebase Firestore is not available in this local environment");
  return getFirestore(getFirebaseAdminApp());
}

export function getAdminStorage() {
  if (!firebaseStorageAvailable()) throw new Error("Firebase Storage is not available in this local environment");
  return getStorage(getFirebaseAdminApp());
}

export function getAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function firebaseAdminCredentialsAvailable() {
  if (process.env.FIREBASE_CONFIG) return true;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  return Boolean(credentialsPath && existsSync(credentialsPath));
}

export function firebaseFirestoreAvailable() {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST) || firebaseAdminCredentialsAvailable();
}

export function firebaseStorageAvailable() {
  return Boolean(process.env.FIREBASE_STORAGE_EMULATOR_HOST) || firebaseAdminCredentialsAvailable();
}
