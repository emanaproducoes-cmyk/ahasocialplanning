import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const cronSecret = request.headers.get("x-cron-secret");
    const isCron = cronSecret === process.env.CRON_SECRET;
    let uid: string | null = null;

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

    const adminDb = getAdminDb();
    const appId = process.env.META_APP_ID!;
    const appSecret = process.env.META_APP_SECRET!;
    const now = Date.now();
    const refreshThreshold = now + 15 * 24 * 60 * 60 * 1000;

    let query = adminDb.collectionGroup("socialAccounts")
      .where("platform", "in", ["instagram", "facebook"])
      .where("status", "==", "connected")
      .where("tokenExpiresAt", "<", refreshThreshold);

    if (uid) {
      query = adminDb.collection("users").doc(uid).collection("socialAccounts")
        .where("platform", "in", ["instagram", "facebook"])
        .where("status", "==", "connected") as typeof query;
    }

    const snap = await query.get();
    let refreshed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const doc of snap.docs) {
      const account = doc.data();
      const token: string = account.metaLongLivedToken;
      if (!token) continue;
      try {
        const res = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${token}`);
        const data = await res.json();
        if (data.access_token) {
          await doc.ref.update({ metaLongLivedToken: data.access_token, tokenExpiresAt: now + (data.expires_in || 60 * 24 * 60 * 60) * 1000, lastTokenRefresh: new Date(), updatedAt: new Date() });
          refreshed++;
        } else {
          await doc.ref.update({ status: "disconnected", updatedAt: new Date() });
          failed++;
          errors.push(`${doc.id}: ${data.error?.message || "Token inválido"}`);
        }
      } catch (err) {
        failed++;
        errors.push(`${doc.id}: ${err}`);
      }
    }

    return NextResponse.json({ success: true, refreshed, failed, errors, total: snap.size });
  } catch (err) {
    console.error("[token-refresh] Erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
