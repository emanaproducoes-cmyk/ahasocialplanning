/**
 * Firebase Admin SDK — server-side apenas
 */

let adminDb: any = null;
let adminAuth: any = null;
let adminStorage: any = null;

export const ADMIN_EMAIL = 'emanaproducoes@gmail.com';

export async function getAdminDb() {
  if (!adminDb) {
    const { getApps, initializeApp, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId:   process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
    adminDb = getFirestore();
  }
  return adminDb;
}

export async function getAdminAuth() {
  if (!adminAuth) {
    const { getApps, initializeApp, cert } = await import('firebase-admin/app');
    const { getAuth } = await import('firebase-admin/auth');
    
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId:   process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
    adminAuth = getAuth();
  }
  return adminAuth;
}

export async function verifyIdToken(token: string): Promise<string> {
  const auth = await getAdminAuth();
  const decoded = await auth.verifyIdToken(token);
  return decoded.uid;
}

export async function isAdminUid(uid: string): Promise<boolean> {
  const auth = await getAdminAuth();
  const user = await auth.getUser(uid);
  return user.email === ADMIN_EMAIL || user.customClaims?.['admin'] === true;
}
