import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/firebase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    // Autenticação via Bearer token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const idToken = authHeader.replace("Bearer ", "");
    let uid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const { accountId } = params;
    const accountRef = adminDb
      .collection("users")
      .doc(uid)
      .collection("socialAccounts")
      .doc(accountId);

    const accountSnap = await accountRef.get();
    if (!accountSnap.exists) {
      return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    }

    const account = accountSnap.data()!;
    // CRÍTICO: Instagram Graph API requer Page Access Token, não o User Long-Lived Token
    const token: string = account._pageToken || account.metaLongLivedToken;
    const platform: string = account.platform;
    const platformId: string = account.platformId;

    let updatedData: Record<string, unknown> = {
      updatedAt: new Date(),
      lastSyncAt: new Date(),
    };

    if (platform === "instagram") {
      // Instagram Graph API
      const igRes = await fetch(
        `https://graph.facebook.com/v21.0/${platformId}` +
          `?fields=id,username,name,biography,followers_count,media_count,profile_picture_url,website` +
          `&access_token=${token}`
      );
      const igData = await igRes.json();

      if (igData.error) {
        console.error("[sync] Instagram API error:", igData.error);
        await accountRef.update({ status: "error", lastError: igData.error.message, updatedAt: new Date() });
        return NextResponse.json({ error: igData.error.message }, { status: 400 });
      }

      updatedData = {
        ...updatedData,
        name: igData.name || account.name,
        handle: igData.username ? `@${igData.username}` : account.handle,
        avatar: igData.profile_picture_url || account.avatar,
        followers: igData.followers_count || 0,
        mediaCount: igData.media_count || 0,
        bio: igData.biography || null,
        website: igData.website || null,
        status: "connected",
        lastError: null,
      };
    } else if (platform === "facebook") {
      // Facebook Graph API
      const fbRes = await fetch(
        `https://graph.facebook.com/v21.0/${platformId}` +
          `?fields=id,name,fan_count,followers_count,picture{url},category,about` +
          `&access_token=${token}`
      );
      const fbData = await fbRes.json();

      if (fbData.error) {
        console.error("[sync] Facebook API error:", fbData.error);
        await accountRef.update({ status: "error", lastError: fbData.error.message, updatedAt: new Date() });
        return NextResponse.json({ error: fbData.error.message }, { status: 400 });
      }

      updatedData = {
        ...updatedData,
        name: fbData.name || account.name,
        avatar: fbData.picture?.data?.url || account.avatar,
        followers: fbData.fan_count || fbData.followers_count || 0,
        status: "connected",
        lastError: null,
      };
    }

    await accountRef.update(updatedData);

    return NextResponse.json({ success: true, data: updatedData });
  } catch (err) {
    console.error("[sync-account] Erro:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
