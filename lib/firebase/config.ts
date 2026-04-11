import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  getFirestore,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}

function initDb() {
  if (typeof window === 'undefined') {
    return getFirestore(app);
  }
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        // ✅ persistentSingleTabManager funciona em todos os browsers,
        // incluindo mobile (Safari, Chrome Android).
        // persistentMultipleTabManager usa SharedWorker que não existe em mobile.
        tabManager: persistentSingleTabManager({}),
      }),
    });
  } catch {
    return getFirestore(app);
  }
}

export const db      = initDb();
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
googleProvider.addScope('email');
googleProvider.addScope('profile');

export default app;
