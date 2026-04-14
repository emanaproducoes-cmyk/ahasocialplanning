// app/api/meta/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

const API_VERSION = "v22.0";

interface PageData {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  instagram_business_account?: { id: string };
}

interface InstagramAccount {
  id: string;
  name?: string;
  username?: string;
  profile_picture_url?: string;
  followers_count?: number;
}

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const { searchParams } = new URL(request.url);

  // ─── 1. Captura erros devolvidos pelo próprio Facebook ───────────────────────
  const fbError = searchParams.get("error");
  const fbErrorReason = searchParams.get("error_reason");
  const fbErrorDesc = searchParams.get("error_description");

  if (fbError) {
    console.error("[meta/callback] Erro retornado pelo Facebook:", {
      error: fbError,
      reason: fbErrorReason,
      description: fbErrorDesc,
    });
    const msg = encodeURIComponent(
      `${fbError}: ${fbErrorDesc ?? fbErrorReason ?? "sem descrição"}`
    );
    return NextResponse.redirect(`${appUrl}/contas?error=${msg}`);
  }

  // ─── 2. Valida code e state ──────────────────────────────────────────────────
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    console.error("[meta/callback] code ou state ausentes", {
      code: !!code,
      state: !!state,
    });
    return NextResponse.redirect(`${appUrl}/contas?error=invalid_callback`);
  }

  // ─── 3. Decodifica e valida o state ─────────────────────────────────────────
  let statePayload: { uid: string; ts: number; nonce: string };
  try {
    statePayload = JSON.parse(
      Buffer.from(state, "base64url").toString("utf-8")
    );
  } catch (err) {
    console.error("[meta/callback] state inválido:", err);
    return NextResponse.redirect(`${appUrl}/contas?error=invalid_state`);
  }

  if (Date.now() - statePayload.ts > 10 * 60 * 1000) {
    console.error("[meta/callback] state expirado");
    return NextResponse.redirect(`${appUrl}/contas?error=state_expired`);
  }

  const { uid } = statePayload;

  const appId = process.env.META_APP_ID!;
  const appSecret = process.env.META_APP_SECRET!;
  const redirectUri = `${appUrl}/api/meta/callback`;

  // ─── 4. Troca code por access_token ─────────────────────────────────────────
  let shortToken: string;
  try {
    const tokenRes = await fetch(
      `https://graph.facebook.com/${API_VERSION}/oauth/access_token` +
        `?client_id=${appId}` +
        `&client_secret=${appSecret}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&code=${code}`
    );
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("[meta/callback] Erro na troca de token:", tokenData.error);
      return NextResponse.redirect(
        `${appUrl}/contas?error=${encodeURIComponent(tokenData.error.message)}`
      );
    }

    shortToken = tokenData.access_token;
  } catch (err) {
    console.error("[meta/callback] token_exchange_failed:", err);
    return NextResponse.redirect(`${appUrl}/contas?error=token_exchange_failed`);
  }

  // ─── 5. Troca por token de longa duração ────────────────────────────────────
  let longToken: string;
  try {
    const longRes = await fetch(
      `https://graph.facebook.com/${API_VERSION}/oauth/access_token` +
        `?grant_type=fb_exchange_token` +
        `&client_id=${appId}` +
        `&client_secret=${appSecret}` +
        `&fb_exchange_token=${shortToken}`
    );
    const longData = await longRes.json();

    if (longData.error) {
      console.error("[meta/callback] Erro no long-lived token:", longData.error);
      return NextResponse.redirect(
        `${appUrl}/contas?error=${encodeURIComponent(longData.error.message)}`
      );
    }

    longToken = longData.access_token;
  } catch (err) {
    console.error("[meta/callback] long_token_failed:", err);
    return NextResponse.redirect(`${appUrl}/contas?error=long_token_failed`);
  }

  // ─── 6. Busca páginas do Facebook vinculadas ────────────────────────────────
  let pages: PageData[] = [];
  try {
    const pagesRes = await fetch(
      `https://graph.facebook.com/${API_VERSION}/me/accounts` +
        `?fields=id,name,access_token,category,instagram_business_account` +
        `&access_token=${longToken}`
    );
    const pagesData = await pagesRes.json();

    if (pagesData.error) {
      console.error("[meta/callback] Erro ao buscar páginas:", pagesData.error);
      return NextResponse.redirect(
        `${appUrl}/contas?error=${encodeURIComponent(pagesData.error.message)}`
      );
    }

    pages = pagesData.data ?? [];
  } catch (err) {
    console.error("[meta/callback] pages_fetch_failed:", err);
    return NextResponse.redirect(`${appUrl}/contas?error=pages_fetch_failed`);
  }

  // ─── 7. Busca dados detalhados do Instagram para cada conta vinculada ────────
  const igDetailsByPageId: Record<string, InstagramAccount> = {};
  for (const page of pages) {
    if (page.instagram_business_account?.id) {
      try {
        const igRes = await fetch(
          `https://graph.facebook.com/${API_VERSION}/${page.instagram_business_account.id}` +
            `?fields=id,name,username,profile_picture_url,followers_count` +
            `&access_token=${page.access_token}`
        );
        const igData = await igRes.json();
        if (!igData.error) {
          igDetailsByPageId[page.id] = igData;
        } else {
          console.warn(
            `[meta/callback] Erro ao buscar detalhes IG para página ${page.id}:`,
            igData.error
          );
        }
      } catch (err) {
        console.warn(
          `[meta/callback] Falha ao buscar detalhes IG para página ${page.id}:`,
          err
        );
      }
    }
  }

  // ─── 8. Salva no Firestore ───────────────────────────────────────────────────
  try {
    const db = getAdminDb();
    const batch = db.batch();

    for (const page of pages) {
      // Salva a página do Facebook
      const pageRef = db
        .collection("users")
        .doc(uid)
        .collection("socialAccounts")
        .doc(`fb_${page.id}`);

      batch.set(pageRef, {
        platform: "facebook",
        pageId: page.id,
        pageName: page.name,
        pageToken: page.access_token,
        category: page.category ?? null,
        userToken: longToken,
        connectedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Salva a conta do Instagram vinculada (se existir)
      if (page.instagram_business_account?.id) {
        const igDetails = igDetailsByPageId[page.id];
        const igRef = db
          .collection("users")
          .doc(uid)
          .collection("socialAccounts")
          .doc(`ig_${page.instagram_business_account.id}`);

        batch.set(igRef, {
          platform: "instagram",
          igId: page.instagram_business_account.id,
          igUsername: igDetails?.username ?? null,
          igName: igDetails?.name ?? null,
          profilePictureUrl: igDetails?.profile_picture_url ?? null,
          followersCount: igDetails?.followers_count ?? null,
          linkedPageId: page.id,
          linkedPageName: page.name,
          pageToken: page.access_token,
          userToken: longToken,
          connectedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    await batch.commit();
    console.log(
      `[meta/callback] ${pages.length} página(s) salvas para uid=${uid}`
    );
  } catch (err) {
    console.error("[meta/callback] firestore_save_failed:", err);
    return NextResponse.redirect(`${appUrl}/contas?error=firestore_save_failed`);
  }

  // ─── 9. Sucesso ──────────────────────────────────────────────────────────────
  return NextResponse.redirect(`${appUrl}/contas?success=true`);
}
