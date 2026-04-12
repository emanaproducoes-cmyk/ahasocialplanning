import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

interface PageData {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  picture?: { data?: { url?: string } };
  fan_count?: number;
  followers_count?: number;
  instagram_business_account?: {
    id: string;
    username?: string;
    name?: string;
    profile_picture_url?: string;
    followers_count?: number;
    biography?: string;
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (error) {
    return NextResponse.redirect(`${appUrl}/contas?error=oauth_cancelled`);
  }

  if (!code || !stateRaw) {
    return NextResponse.redirect(`${appUrl}/contas?error=invalid_callback`);
  }

  // Decodifica e valida o state
  let uid: string;
  try {
    const payload = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
    uid = payload.uid;
    // TTL de 10 minutos
    if (Date.now() - payload.ts > 10 * 60 * 1000) {
      return NextResponse.redirect(`${appUrl}/contas?error=state_expired`);
    }
  } catch {
    return NextResponse.redirect(`${appUrl}/contas?error=invalid_state`);
  }

  const appId = process.env.META_APP_ID!;
  const appSecret = process.env.META_APP_SECRET!;
  const redirectUri = `${appUrl}/api/meta/callback`;

  try {
    // 1. Troca code por short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token` +
        `?client_id=${appId}` +
        `&client_secret=${appSecret}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&code=${code}`
    );
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("[callback] Erro ao obter token:", tokenData);
      return NextResponse.redirect(`${appUrl}/contas?error=token_exchange_failed`);
    }

    // 2. Troca por long-lived token (válido 60 dias)
    const llRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token` +
        `?grant_type=fb_exchange_token` +
        `&client_id=${appId}` +
        `&client_secret=${appSecret}` +
        `&fb_exchange_token=${tokenData.access_token}`
    );
    const llData = await llRes.json();
    const longLivedToken: string = llData.access_token || tokenData.access_token;

    // 3. Busca as Páginas do usuário com Page Access Tokens e dados do Instagram vinculado
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts` +
        `?fields=id,name,access_token,category,fan_count,followers_count,picture,instagram_business_account{id,username,name,profile_picture_url,followers_count,biography}` +
        `&access_token=${longLivedToken}`
    );
    const pagesData = await pagesRes.json();
    const pages: PageData[] = pagesData.data || [];

    const batch = adminDb.batch();
    let accountsCreated = 0;

    for (const page of pages) {
      // Cria conta Facebook Page
      const fbRef = adminDb
        .collection("users")
        .doc(uid)
        .collection("socialAccounts")
        .doc(`fb_${page.id}`);

      batch.set(
        fbRef,
        {
          platform: "facebook",
          platformId: page.id,
          name: page.name,
          handle: page.name,
          avatar: page.picture?.data?.url || null,
          followers: page.fan_count || page.followers_count || 0,
          category: page.category || null,
          status: "connected",
          metaLongLivedToken: longLivedToken,
          _pageToken: page.access_token, // Page Access Token (para publicação)
          tokenExpiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000, // ~60 dias
          connectedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      accountsCreated++;

      // Se a Página tem Instagram Business vinculado, cria conta Instagram
      const igAccount = page.instagram_business_account;
      if (igAccount?.id) {
        const igRef = adminDb
          .collection("users")
          .doc(uid)
          .collection("socialAccounts")
          .doc(`ig_${igAccount.id}`);

        batch.set(
          igRef,
          {
            platform: "instagram",
            platformId: igAccount.id,
            name: igAccount.name || igAccount.username || page.name,
            handle: igAccount.username ? `@${igAccount.username}` : page.name,
            avatar: igAccount.profile_picture_url || null,
            followers: igAccount.followers_count || 0,
            bio: igAccount.biography || null,
            linkedPageId: page.id,
            status: "connected",
            metaLongLivedToken: longLivedToken,
            _pageToken: page.access_token, // Instagram Graph API usa o Page Token
            tokenExpiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000,
            connectedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        accountsCreated++;
      }
    }

    await batch.commit();

    return NextResponse.redirect(
      `${appUrl}/contas?success=true&count=${accountsCreated}&pages=${pages.length}`
    );
  } catch (err) {
    console.error("[meta/callback] Erro:", err);
    return NextResponse.redirect(`${appUrl}/contas?error=server_error`);
  }
}
