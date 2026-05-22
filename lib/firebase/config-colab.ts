import { getApps, initializeApp, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, memoryLocalCache } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const appName = 'colab-app';
const app = getApps().find(a => a.name === appName) ?? initializeApp(firebaseConfig, appName);

function initColabDb() {
  if (typeof window === 'undefined') return getFirestore(app);
  try {
    return initializeFirestore(app, { localCache: memoryLocalCache() });
  } catch {
    return getFirestore(app);
  }
}

export const dbColab = initColabDb();
