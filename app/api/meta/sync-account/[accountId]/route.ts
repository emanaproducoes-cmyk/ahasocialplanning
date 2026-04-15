// app/api/meta/sync-account/[accountId]/route.ts
// Busca dados atualizados da conta na Graph API e atualiza o Firestore.
// Chamado manualmente pelo botão "Sincronizar" do ContaCard.
import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

const API_VERSION = "v21.0";

export async function POST(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  // ─── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(authHeader.replace("Bearer ", ""));
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  // ─── Busca a conta no Firestore ──────────────────────────────────────────────
  const { accountId } = params;
  const db = getAdminDb();
  const accountRef = db
    .collection("users").doc(uid)
    .collection("socialAccounts").doc(accountId);

  const snap = await accountRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
  }

  const account = snap.data()!;
  const platform: string = account.platform;
  const platformId: string = account.platformId;

  // _pageToken é o Page Access Token: tem permissão para acessar IG e FB
  // Fallback para metaLongLivedToken (compatibilidade com versões antigas)
  const token: string = account._pageToken ?? account.metaLongLivedToken;

  if (!token) {
    await accountRef.update({ status: "error", lastError: "Token não encontrado", updatedAt: new Date() });
    return NextResponse.json({ error: "Token não encontrado" }, { status: 400 });
  }

  if (!platformId) {
    return NextResponse.json({ error: "platformId ausente na conta" }, { status: 400 });
  }

  // ─── Busca dados na Graph API e atualiza ────────────────────────────────────
  const baseUpdate = { updatedAt: new Date(), lastSyncAt: new Date() };

  try {
    if (platform === "instagram") {
      const res = await fetch(
        `https://graph.facebook.com/${API_VERSION}/${platformId}` +
          `?fields=id,username,name,biography,followers_count,media_count,profile_picture_url,website` +
          `&access_token=${token}`
      );
      const data = await res.json();

      if (data.error) {
        await accountRef.update({ status: "error", lastError: data.error.message, updatedAt: new Date() });
        return NextResponse.json({ error: data.error.message }, { status: 400 });
      }

      const updated = {
        ...baseUpdate,
        name: data.name ?? account.name,
        handle: data.username ? `@${data.username}` : account.handle,
        avatar: data.profile_picture_url ?? account.avatar,
        followers: data.followers_count ?? 0,
        mediaCount: data.media_count ?? 0,
        bio: data.biography ?? null,
        website: data.website ?? null,
        status: "connected",
        lastError: null,
      };

      await accountRef.update(updated);
      console.log(`[sync-account] ✅ Instagram ${accountId} sincronizado`);
      return NextResponse.json({ success: true, data: updated });

    } else if (platform === "facebook") {
      const res = await fetch(
        `https://graph.facebook.com/${API_VERSION}/${platformId}` +
          `?fields=id,name,fan_count,followers_count,picture{url},category,about` +
          `&access_token=${token}`
      );
      const data = await res.json();

      if (data.error) {
        await accountRef.update({ status: "error", lastError: data.error.message, updatedAt: new Date() });
        return NextResponse.json({ error: data.error.message }, { status: 400 });
      }

      const updated = {
        ...baseUpdate,
        name: data.name ?? account.name,
        handle: data.name ?? account.handle,
        avatar: data.picture?.data?.url ?? account.avatar,
        followers: data.fan_count ?? data.followers_count ?? 0,
        status: "connected",
        lastError: null,
      };

      await accountRef.update(updated);
      console.log(`[sync-account] ✅ Facebook ${accountId} sincronizado`);
      return NextResponse.json({ success: true, data: updated });

    } else {
      return NextResponse.json(
        { error: `Plataforma '${platform}' não suportada` },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("[sync-account] Erro inesperado:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
