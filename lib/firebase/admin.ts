/**
 * lib/firebase/admin.ts — Firebase Admin SDK (server-side only)
 *
 * FIXES vs versão anterior:
 * 1. Removido import do tipo `App` — não está disponível em todos os
 *    sub-paths do firebase-admin v12 e causava erro de build.
 * 2. Sem anotações de tipo explícitas nos exports (inferência do TS) —
 *    evita conflito com "noUnusedLocals" do tsconfig strict.
 * 3. ensureAdminApp() chamado duas vezes (db + auth) é seguro porque
 *    getApps().length > 0 retorna o app já criado na segunda chamada.
 */

import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore }                  from 'firebase-admin/firestore';
import { getAuth }                       from 'firebase-admin/auth';

export const ADMIN_EMAIL = 'emanaproducoes@gmail.com';

function ensureAdminApp() {
  if (getApps().length > 0) return getApps()[0]!;
  return initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      // Vercel armazena a chave com \n literal — converte para quebra real
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const adminDb   = getFirestore(ensureAdminApp());
export const adminAuth = getAuth(ensureAdminApp());

/** Verifica um Firebase ID token e retorna o UID. */
export async function verifyIdToken(token: string): Promise<string> {
  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

/** Checa se um UID é admin (por e-mail ou custom claim). */
export async function isAdminUid(uid: string): Promise<boolean> {
  const user = await adminAuth.getUser(uid);
  return (
    user.email === ADMIN_EMAIL ||
    (user.customClaims?.['admin'] as boolean | undefined) === true
  );
}

// Wrappers async mantidos para retrocompatibilidade com código existente
export async function getAdminDb()   { return adminDb;   }
export async function getAdminAuth() { return adminAuth; }
