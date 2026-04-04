/**
 * ⚠️  ARQUIVO SERVER-SIDE APENAS
 * Nunca importe este arquivo em componentes com 'use client'
 * Use apenas em: app/api/**, firebase/functions/**
 */

import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth }      from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage }   from 'firebase-admin/storage';

function getAdminApp(): App {
  if (getApps().length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return getApps()[0]!;
  }

  const projectId       = process.env.FIREBASE_PROJECT_ID;
  const clientEmail     = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey      = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const storageBucket   = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      '[Firebase Admin] Variáveis de ambiente ausentes: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket,
  });
}

const adminApp = getAdminApp();

export const adminAuth      = getAuth(adminApp);
export const adminDb        = getFirestore(adminApp);
export const adminStorage   = getStorage(adminApp);

export const ADMIN_EMAIL = 'emanaproducoes@gmail.com';

/**
 * Verifica se um token de ID do Firebase é válido e retorna o uid.
 * Lança erro se inválido.
 */
export async function verifyIdToken(token: string): Promise<string> {
  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

/**
 * Verifica se o uid pertence ao administrador da plataforma.
 */
export async function isAdminUid(uid: string): Promise<boolean> {
  const user = await adminAuth.getUser(uid);
  return user.email === ADMIN_EMAIL || user.customClaims?.['admin'] === true;
}

export default adminApp;
