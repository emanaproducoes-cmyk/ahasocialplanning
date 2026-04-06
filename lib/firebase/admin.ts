/**
 * lib/firebase/admin.ts — Firebase Admin SDK (server-side only)
 *
 * FIX CRÍTICO: initializeApp() NÃO pode ser chamado no nível do módulo.
 * Durante o build do Next.js/Vercel as env vars do Firebase ainda não existem,
 * então cert() lançava erro e derrubava o build inteiro.
 *
 * Solução: inicialização LAZY — o app só é criado quando uma função é chamada
 * em runtime (nunca durante o build).
 */

import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore }                  from 'firebase-admin/firestore';
import { getAuth }                       from 'firebase-admin/auth';

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

/**
 * Use estas funções nas rotas em vez de importar adminDb/adminAuth diretamente.
 * Chamadas síncronas — retornam a instância, não uma Promise.
 */
export function getAdminDb()   { return getFirestore(getAdminApp()); }
export function getAdminAuth() { return getAuth(getAdminApp());      }

// Aliases async mantidos para retrocompatibilidade
export async function getAdminDbAsync()   { return getAdminDb();   }
export async function getAdminAuthAsync() { return getAdminAuth(); }

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
