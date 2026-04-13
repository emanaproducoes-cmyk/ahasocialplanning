import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore }                  from 'firebase-admin/firestore';
import { getAuth }                       from 'firebase-admin/auth';
import { getStorage }                    from 'firebase-admin/storage';

export const ADMIN_EMAIL = 'emanaproducoes@gmail.com';

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0]!;
  return initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID   ?? '',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? '',
      privateKey: (process.env.FIREBASE_PRIVATE_KEY  ?? '').replace(/\\n/g, '\n'),
    }),
  });
}

export function getAdminDb()      { return getFirestore(getAdminApp()); }
export function getAdminAuth()    { return getAuth(getAdminApp());      }
export function getAdminStorage() { return getStorage(getAdminApp());   }

export async function getAdminDbAsync()      { return getAdminDb();      }
export async function getAdminAuthAsync()    { return getAdminAuth();    }
export async function getAdminStorageAsync() { return getAdminStorage(); }

export async function verifyIdToken(token: string): Promise<string> {
  const decoded = await getAdminAuth().verifyIdToken(token);
  return decoded.uid;
}

export async function isAdminUid(uid: string): Promise<boolean> {
  const user = await getAdminAuth().getUser(uid);
  return (
    user.email === ADMIN_EMAIL ||
    (user.customClaims?.['admin'] as boolean | undefined) === true
  );
}
