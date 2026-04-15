// app/api/meta/token-refresh/route.ts
// Renova o Long-Lived Token da Meta (válido por ~60 dias).
//
// Dois modos de chamada:
//   1. CRON automático:  header x-cron-secret = process.env.CRON_SECRET
//      → renova TODAS as contas que expiram nos próximos 15 dias
//   2. Manual (usuário): header Authorization: Bearer <idToken>
//      → renova apenas as contas do usuário autenticado
import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

const API_VERSION = "v21.0";
// Renova quando faltam menos de 15 dias para expirar
const DAYS_BEFORE_EXPIRY = 15;

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret");
  const isCron = cronSecret === process.env.CRON_SECRET;
  let uid: string | null = null;

  // ─── Auth ────────────────────────────────────────────────────────────────────
  if (!isCron) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    try {
      const decoded = await getAdminAuth().verifyIdToken(authHeader.replace("Bearer ", ""));
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }
  }

  const db = getAdminDb();
  const appId = process.env.META_APP_ID!;
  const appSecret = process.env.META_APP_SECRET!;
  const now = Date.now();
  const refreshThreshold = now + DAYS_BEFORE_EXPIRY * 24 * 60 * 60 * 1000;

  // ─── Seleciona contas a renovar ─────────────────────────────────────────────
  let snap: FirebaseFirestore.QuerySnapshot;

  if (isCron) {
    // CRON: collectionGroup em todas as contas próximas do vencimento
    snap = await db
      .collectionGroup("socialAccounts")
      .where("platform", "in", ["instagram", "facebook"])
      .where("status", "==", "connected")
      .where("tokenExpiresAt", "<", refreshThreshold)
      .get();
  } else {
    // Manual: só as contas do usuário logado (ignora threshold — renova todas)
    snap = await db
      .collection("users").doc(uid!)
      .collection("socialAccounts")
      .where("platform", "in", ["instagram", "facebook"])
      .where("status", "==", "connected")
      .get();
  }

  if (snap.empty) {
    return NextResponse.json({ success: true, refreshed: 0, failed: 0, total: 0 });
  }

  let refreshed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const doc of snap.docs) {
    const account = doc.data();
    // metaLongLivedToken é o User Token — é ele que renovamos
    const token: string = account.metaLongLivedToken;
    if (!token) continue;

    try {
      const res = await fetch(
        `https://graph.facebook.com/${API_VERSION}/oauth/access_token` +
          `?grant_type=fb_exchange_token` +
          `&client_id=${appId}&client_secret=${appSecret}` +
          `&fb_exchange_token=${token}`
      );
      const data = await res.json();

      if (data.access_token) {
        const newExpiresAt = now + (data.expires_in ?? 5_184_000) * 1000;
        await doc.ref.update({
          metaLongLivedToken: data.access_token,
          tokenExpiresAt: newExpiresAt,
          lastTokenRefresh: new Date(),
          updatedAt: new Date(),
        });
        refreshed++;
      } else {
        // Token inválido — marca conta como desconectada
        await doc.ref.update({ status: "disconnected", updatedAt: new Date() });
        failed++;
        errors.push(`${doc.id}: ${data.error?.message ?? "Token inválido"}`);
      }
    } catch (err) {
      failed++;
      errors.push(`${doc.id}: ${err}`);
    }
  }

  console.log(`[token-refresh] ✅ refreshed=${refreshed} failed=${failed} total=${snap.size}`);
  return NextResponse.json({ success: true, refreshed, failed, errors, total: snap.size });
}
