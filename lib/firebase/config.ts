import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Singleton — evita re-inicialização no HMR do Next.js
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: 'select_account' });

// Persistência offline via IndexedDB (apenas no browser)
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err: { code: string }) => {
    if (err.code === 'failed-precondition') {
      console.warn('[Firebase] Persistência offline disponível em apenas uma aba por vez.');
    } else if (err.code === 'unimplemented') {
      console.warn('[Firebase] Navegador não suporta persistência offline.');
    }
  });
}

export default app;
