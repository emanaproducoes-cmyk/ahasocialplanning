// app/api/meta/callback/route.ts
// Recebe o code do OAuth da Meta, troca por tokens, busca páginas/contas IG
// e salva no Firestore com o modelo de dados UNIFICADO.
//
// Modelo de dados (socialAccounts/{fb_<pageId> | ig_<igId>}):
//   platform         "facebook" | "instagram"
//   platformId       ID da página/conta IG (usado por sync-account)
//   name             Nome de exibição (lido pelo ContaCard)
//   handle           @username ou nome da página (lido pelo ContaCard)
//   avatar           URL da foto de perfil (lido pelo ContaCard)
//   followers        Nº de seguidores (lido pelo ContaCard)
//   status           "connected" | "disconnected" | "error"
//   tokenExpiresAt   Timestamp em ms (lido pelo ContaCard para badge de validade)
//   _pageToken       Page Access Token — NUNCA vai ao client (Firestore Rules)
//   metaLongLivedToken User Long-Lived Token — NUNCA vai ao client
//   connectedAt      Timestamp
//   updatedAt        Timestamp
//   lastSyncAt       Timestamp
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

const API_VERSION = "v21.0";

interface PageData {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  fan_count?: number;
  followers_count?: number;
  picture?: { data?: { url?: string } };
  instagram_business_account?: { id: string };
}

interface InstagramAccount {
  id: string;
  name?: string;
  username?: string;
  profile_picture_url?: string;
  followers_count?: number;
}

// Helper: fetch com verificação de erro da Graph API
async function graphFetch<T = Record<string, unknown>>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = (await res.json()) as T & { error?: { message: string } };
  if ((data as { error?: { message: string } }).error) {
    throw new Error((data as { error: { message: string } }).error.message);
  }
  return data;
}

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const { searchParams } = new URL(request.url);

  // ─── 1. Captura erros retornados pelo Facebook ───────────────────────────────
  const fbError = searchParams.get("error");
  if (fbError) {
    const desc = searchParams.get("error_description") ?? searchParams.get("error_reason") ?? "sem descrição";
    console.error("[meta/callback] Erro retornado pelo Facebook:", fbError, desc);
    return NextResponse.redirect(
      `${appUrl}/contas?error=${encodeURIComponent(`${fbError}: ${desc}`)}`
    );
  }

  // ─── 2. Valida code e state ──────────────────────────────────────────────────
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    console.error("[meta/callback] code ou state ausentes");
    return NextResponse.redirect(`${appUrl}/contas?error=invalid_callback`);
  }

  // ─── 3. Decodifica state anti-CSRF ──────────────────────────────────────────
  let uid: string;
  try {
    const payload = JSON.parse(Buffer.from(state, "base64url").toString("utf-8")) as {
      uid: string;
      ts: number;
    };
    // State válido por 10 minutos
    if (Date.now() - payload.ts > 10 * 60 * 1000) {
      console.error("[meta/callback] state expirado");
      return NextResponse.redirect(`${appUrl}/contas?error=state_expired`);
    }
    uid = payload.uid;
  } catch (err) {
    console.error("[meta/callback] state inválido:", err);
    return NextResponse.redirect(`${appUrl}/contas?error=invalid_state`);
  }

  const appId = process.env.META_APP_ID!;
  const appSecret = process.env.META_APP_SECRET!;
  const redirectUri = `${appUrl}/api/meta/callback`;

  // ─── 4. Troca code → short-lived token ─────────────────────────────────────
  let shortToken: string;
  try {
    const data = await graphFetch<{ access_token: string }>(
      `https://graph.facebook.com/${API_VERSION}/oauth/access_token` +
        `?client_id=${appId}&client_secret=${appSecret}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
    );
    shortToken = data.access_token;
  } catch (err) {
    console.error("[meta/callback] token_exchange_failed:", err);
    return NextResponse.redirect(`${appUrl}/contas?error=token_exchange_failed`);
  }

  // ─── 5. Troca short-lived → long-lived (~60 dias) ───────────────────────────
  let longToken: string;
  let tokenExpiresAt: number;
  try {
    const data = await graphFetch<{ access_token: string; expires_in?: number }>(
      `https://graph.facebook.com/${API_VERSION}/oauth/access_token` +
        `?grant_type=fb_exchange_token&client_id=${appId}` +
        `&client_secret=${appSecret}&fb_exchange_token=${shortToken}`
    );
    longToken = data.access_token;
    // expires_in em segundos; 5_184_000 = 60 dias (padrão Meta)
    tokenExpiresAt = Date.now() + (data.expires_in ?? 5_184_000) * 1000;
  } catch (err) {
    console.error("[meta/callback] long_token_failed:", err);
    return NextResponse.redirect(`${appUrl}/contas?error=long_token_failed`);
  }

  // ─── 6. Busca páginas do Facebook (com foto + dados de seguidores) ──────────
  let pages: PageData[] = [];
  try {
    const fields = [
      "id",
      "name",
      "access_token",
      "category",
      "fan_count",
      "followers_count",
      "picture.type(large)",
      "instagram_business_account",
    ].join(",");

    const data = await graphFetch<{ data: PageData[] }>(
      `https://graph.facebook.com/${API_VERSION}/me/accounts` +
        `?fields=${encodeURIComponent(fields)}&access_token=${longToken}`
    );
    pages = data.data ?? [];
  } catch (err) {
    console.error("[meta/callback] pages_fetch_failed:", err);
    return NextResponse.redirect(`${appUrl}/contas?error=pages_fetch_failed`);
  }

  if (pages.length === 0) {
    // Usuário não tem páginas — ainda salva para registrar a sessão
    console.warn(`[meta/callback] uid=${uid} não tem páginas do Facebook`);
    return NextResponse.redirect(`${appUrl}/contas?error=no_pages_found`);
  }

  // ─── 7. Busca detalhes das contas Instagram Business vinculadas ─────────────
  const igByPageId: Record<string, InstagramAccount> = {};
  await Promise.all(
    pages.map(async (page) => {
      if (!page.instagram_business_account?.id) return;
      try {
        const data = await graphFetch<InstagramAccount>(
          `https://graph.facebook.com/${API_VERSION}/${page.instagram_business_account.id}` +
            `?fields=id,name,username,profile_picture_url,followers_count` +
            `&access_token=${page.access_token}`
        );
        igByPageId[page.id] = data;
      } catch (err) {
        // Não-fatal: a conta Facebook ainda será salva
        console.warn(`[meta/callback] IG details failed for page ${page.id}:`, err);
      }
    })
  );

  // ─── 8. Grava no Firestore com modelo unificado ─────────────────────────────
  // IMPORTANTE: _pageToken e metaLongLivedToken são bloqueados pelas Firestore
  // Rules para leitura do client — só o Admin SDK (server) os acessa.
  try {
    const db = getAdminDb();
    const batch = db.batch();
    const now = FieldValue.serverTimestamp();

    for (const page of pages) {
      const fbFollowers = page.fan_count ?? page.followers_count ?? 0;

      // ── Página do Facebook ───────────────────────────────────────────────────
      const fbRef = db
        .collection("users").doc(uid)
        .collection("socialAccounts").doc(`fb_${page.id}`);

      batch.set(
        fbRef,
        {
          // ── Identificação ──
          platform: "facebook",
          platformId: page.id,          // lido por sync-account
          // ── Exibição (ContaCard) ──
          name: page.name,
          handle: page.name,
          avatar: page.picture?.data?.url ?? null,
          followers: fbFollowers,
          status: "connected",
          // ── Tokens (server-only) ──
          _pageToken: page.access_token,
          metaLongLivedToken: longToken,
          tokenExpiresAt,               // ms; lido pelo ContaCard para badge
          // ── Metadados ──
          category: page.category ?? null,
          lastError: null,
          connectedAt: now,
          updatedAt: now,
          lastSyncAt: now,
        },
        { merge: true }
      );

      // ── Conta Instagram Business ─────────────────────────────────────────────
      if (page.instagram_business_account?.id) {
        const ig = igByPageId[page.id];
        const igRef = db
          .collection("users").doc(uid)
          .collection("socialAccounts").doc(`ig_${page.instagram_business_account.id}`);

        batch.set(
          igRef,
          {
            // ── Identificação ──
            platform: "instagram",
            platformId: page.instagram_business_account.id, // lido por sync-account
            // ── Exibição (ContaCard) ──
            name: ig?.name ?? ig?.username ?? page.name,
            handle: ig?.username ? `@${ig.username}` : null,
            avatar: ig?.profile_picture_url ?? null,
            followers: ig?.followers_count ?? 0,
            status: "connected",
            // ── Página vinculada ──
            linkedPageId: page.id,
            linkedPageName: page.name,
            // ── Tokens (server-only) ──
            _pageToken: page.access_token,
            metaLongLivedToken: longToken,
            tokenExpiresAt,
            // ── Metadados ──
            lastError: null,
            connectedAt: now,
            updatedAt: now,
            lastSyncAt: now,
          },
          { merge: true }
        );
      }
    }

    await batch.commit();

    const totalContas = pages.reduce(
      (acc, p) => acc + 1 + (p.instagram_business_account ? 1 : 0),
      0
    );
    console.log(`[meta/callback] ✅ ${totalContas} conta(s) salvas para uid=${uid}`);

    // count é lido pela página /contas para exibir o toast
    return NextResponse.redirect(`${appUrl}/contas?success=true&count=${totalContas}`);
  } catch (err) {
    console.error("[meta/callback] firestore_save_failed:", err);
    return NextResponse.redirect(`${appUrl}/contas?error=firestore_save_failed`);
  }
}
