/**
 * lib/firebase/admin.ts
 *
 * Firebase Admin SDK — server-side only.
 *
 * FIX: Previous version exported `adminDb = null` and `adminAuth = null` at module
 * level with lazy async getters. Both API routes imported these as if initialized,
 * crashing immediately with "Cannot read properties of null".
 *
 * This version uses the standard synchronous initialization pattern for Next.js:
 * firebase-admin initializes synchronously (unlike the client SDK), so we export
 * live instances directly.
 */

import { cert, getApps, initializeApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore }            from 'firebase-admin/firestore';
import { getAuth, Auth }                      from 'firebase-admin/auth';

export const ADMIN_EMAIL = 'emanaproducoes@gmail.com';

function getOrInitApp(): App {
  if (getApps().length > 0) return getApps()[0];

  return initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      // Vercel stores the key with literal \n — replace them with real newlines
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const adminApp = getOrInitApp();

export const adminDb:   Firestore = getFirestore(adminApp);
export const adminAuth: Auth      = getAuth(adminApp);

/** Verify a Firebase ID token and return the UID. */
export async function verifyIdToken(token: string): Promise<string> {
  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

/** Check whether a UID is an admin (by email or custom claim). */
export async function isAdminUid(uid: string): Promise<boolean> {
  const user = await adminAuth.getUser(uid);
  return user.email === ADMIN_EMAIL || user.customClaims?.['admin'] === true;
}

// Legacy async wrappers kept for backward-compat (no-op now, just return the singletons)
export async function getAdminDb():   Promise<Firestore> { return adminDb;   }
export async function getAdminAuth(): Promise<Auth>      { return adminAuth; }
