// app/api/meta/callback/route.ts
// Recebe o code do OAuth da Meta, troca por tokens, busca páginas/contas IG
// e salva no Firestore.

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

const API_VERSION = "v21.0";
const GRAPH = `https://graph.facebook.com/${API_VERSION}`;

interface GraphError { error: { message: string; code?: number; type?: string } }
interface TokenResponse { access_token: string; expires_in?: number; token_type?: string }

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
  biography?: string;
  website?: string;
  media_count?: number;
  account_type?: string;
}

async function graphGet<T>(url: string, label: string): Promise<{ data: T; error?: string }> {
  try {
    const res  = await fetch(url);
    const json = (await res.json()) as T & GraphError;
    if ((json as GraphError).error) {
      const msg = (json as GraphError).error.message;
      console.error(`[meta/callback] graphGet ${label} erro:`, msg, `code=${(json as GraphError).error.code}`);
      return { data: json, error: msg };
    }
    return { data: json };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[meta/callback] graphGet ${label} exception:`, msg);
    return { data: {} as T, error: msg };
  }
}

export async function GET(request: NextRequest) {
  // FIX #1: Normaliza appUrl — mesmo tratamento do connect/route.ts.
  // Evita redirect_uri com barra dupla no token exchange com a Meta.
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  const { searchParams } = new URL(request.url);

  // ─── 1. Erro retornado pelo Facebook/Instagram ───────────────────────────────
  const fbError = searchParams.get("error");
  if (fbError) {
    const reason = searchParams.get("error_reason") ?? "";
    const desc   = searchParams.get("error_description") ?? "sem descrição";
    console.error(`[meta/callback] Facebook retornou erro: ${fbError} | reason=${reason} | desc=${desc}`);
    return NextResponse.redirect(
      `${appUrl}/contas?error=${encodeURIComponent(`${fbError}: ${desc}`)}`
    );
  }

  // ─── 2. Valida presença de code e state ─────────────────────────────────────
  const code  = searchParams.get("code");
  const state = searchParams.get("state");

  console.log(`[meta/callback] Recebido — code=${code ? "✓" : "✗"} state=${state ? "✓" : "✗"}`);

  if (!code || !state) {
    console.error("[meta/callback] code ou state ausentes na URL de callback");
    return NextResponse.redirect(`${appUrl}/contas?error=invalid_callback`);
  }

  // ─── 3. Decodifica e valida state anti-CSRF ──────────────────────────────────
  // FIX #2: searchParams.get("state") já faz URL-decode automaticamente.
  // O connect envia state = encodeURIComponent(base64(payload)).
  // Aqui o state já chegou decodificado pelo Next.js, então basta Buffer.from(state, "base64").
  // Fallback para base64url mantém compatibilidade com versões anteriores do connect.
  let uid: string;
  try {
    let rawPayload: string;
    try {
      rawPayload = Buffer.from(state, "base64").toString("utf-8");
      JSON.parse(rawPayload); // valida JSON antes de usar
    } catch {
      // fallback: tenta base64url (versão anterior)
      rawPayload = Buffer.from(state, "base64url").toString("utf-8");
    }

    const payload = JSON.parse(rawPayload) as { uid: string; ts: number; nonce?: string };

    if (!payload.uid || !payload.ts) {
      throw new Error("Campos uid ou ts ausentes no state");
    }

    const ageMs = Date.now() - payload.ts;
    if (ageMs > 10 * 60 * 1000) {
      console.error(`[meta/callback] state expirado (${Math.floor(ageMs / 1000)}s atrás)`);
      return NextResponse.redirect(`${appUrl}/contas?error=state_expired`);
    }

    uid = payload.uid;
    console.log(`[meta/callback] state válido — uid=${uid} age=${Math.floor(ageMs / 1000)}s`);
  } catch (err) {
    console.error("[meta/callback] state inválido:", err);
    return NextResponse.redirect(`${appUrl}/contas?error=invalid_state`);
  }

  const appId      = process.env.META_APP_ID!;
  const appSecret  = process.env.META_APP_SECRET!;
  const redirectUri = `${appUrl}/api/meta/callback`;

  if (!appSecret) {
    console.error("[meta/callback] META_APP_SECRET não definida!");
    return NextResponse.redirect(`${appUrl}/contas?error=server_misconfigured`);
  }

  // ─── 4. code → short-lived token ────────────────────────────────────────────
  console.log(`[meta/callback] Trocando code por short token...`);
  const { data: tokenData, error: tokenError } = await graphGet<TokenResponse>(
    `${GRAPH}/oauth/access_token` +
      `?client_id=${appId}` +
      `&client_secret=${appSecret}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&code=${code}`,
    "token_exchange"
  );

  if (tokenError || !tokenData.access_token) {
    console.error("[meta/callback] token_exchange_failed:", tokenError);
    return NextResponse.redirect(`${appUrl}/contas?error=token_exchange_failed`);
  }

  const shortToken = tokenData.access_token;
  console.log(`[meta/callback] short token obtido ✓`);

  // ─── 5. short-lived → long-lived (~60 dias) ──────────────────────────────────
  console.log(`[meta/callback] Trocando por long-lived token...`);
  const { data: llData, error: llError } = await graphGet<TokenResponse>(
    `${GRAPH}/oauth/access_token` +
      `?grant_type=fb_exchange_token` +
      `&client_id=${appId}` +
      `&client_secret=${appSecret}` +
      `&fb_exchange_token=${shortToken}`,
    "long_token"
  );

  const longToken      = llError ? shortToken : (llData.access_token ?? shortToken);
  const tokenExpiresAt = Date.now() + ((llError ? 3600 : (llData.expires_in ?? 5_184_000)) * 1000);

  if (llError) {
    console.warn(`[meta/callback] long_token_failed — usando short token: ${llError}`);
  } else {
    const daysValid = Math.floor((tokenExpiresAt - Date.now()) / 86400000);
    console.log(`[meta/callback] long token obtido ✓ (válido ${daysValid} dias)`);
  }

  // ─── 6. Busca páginas do Facebook ────────────────────────────────────────────
  console.log(`[meta/callback] Buscando páginas do Facebook...`);
  const pageFields = [
    "id", "name", "access_token", "category",
    "fan_count", "followers_count",
    "picture.type(large)",
    "instagram_business_account",
  ].join(",");

  const { data: pagesData, error: pagesError } = await graphGet<{ data: PageData[] }>(
    `${GRAPH}/me/accounts?fields=${encodeURIComponent(pageFields)}&access_token=${longToken}`,
    "pages_fetch"
  );

  const pages: PageData[] = pagesData?.data ?? [];
  console.log(`[meta/callback] Páginas encontradas: ${pages.length}`);

  if (pagesError) {
    console.error("[meta/callback] pages_fetch_failed:", pagesError);
    return NextResponse.redirect(`${appUrl}/contas?error=pages_fetch_failed`);
  }

  // ─── 7. Fallback: sem páginas FB, tenta buscar IG direto via /me ─────────────
  let igMeDirect: InstagramAccount | null = null;

  if (pages.length === 0) {
    console.warn(`[meta/callback] uid=${uid} — sem páginas FB. Tentando busca direta de IG via /me...`);

    const { data: igMe, error: igMeError } = await graphGet<InstagramAccount>(
      `${GRAPH}/me?fields=id,name,username,profile_picture_url,followers_count,biography,media_count,account_type` +
        `&access_token=${longToken}`,
      "ig_me_direct"
    );

    if (!igMeError && igMe?.id) {
      igMeDirect = igMe;
      console.log(`[meta/callback] Conta IG direta encontrada: @${igMe.username ?? igMe.id}`);
    } else {
      console.error("[meta/callback] no_pages_found — sem Página FB e sem IG direta");
      return NextResponse.redirect(`${appUrl}/contas?error=no_pages_found`);
    }
  }

  // ─── 8. Busca detalhes das contas IG vinculadas a cada página ────────────────
  const igByPageId: Record<string, InstagramAccount> = {};

  await Promise.allSettled(
    pages.map(async (page) => {
      if (!page.instagram_business_account?.id) return;
      const igId = page.instagram_business_account.id;

      const { data: igData, error: igError } = await graphGet<InstagramAccount>(
        `${GRAPH}/${igId}` +
          `?fields=id,name,username,profile_picture_url,followers_count,biography,media_count` +
          `&access_token=${page.access_token}`,
        `ig_details_${igId}`
      );

      if (!igError && igData?.id) {
        igByPageId[page.id] = igData;
        console.log(`[meta/callback] IG @${igData.username} vinculado à página "${page.name}"`);
      } else {
        console.warn(`[meta/callback] Não foi possível buscar IG da página ${page.id}: ${igError}`);
      }
    })
  );

  // ─── 9. Grava no Firestore ───────────────────────────────────────────────────
  console.log(`[meta/callback] Gravando no Firestore... uid=${uid}`);
  try {
    const db    = getAdminDb();
    const batch = db.batch();
    const now   = FieldValue.serverTimestamp();
    let totalContas = 0;

    if (igMeDirect) {
      const igRef = db
        .collection("users").doc(uid)
        .collection("socialAccounts").doc(`ig_${igMeDirect.id}`);

      batch.set(igRef, {
        platform:           "instagram",
        platformId:         igMeDirect.id,
        name:               igMeDirect.name ?? igMeDirect.username ?? "Instagram",
        handle:             igMeDirect.username ? `@${igMeDirect.username}` : null,
        avatar:             igMeDirect.profile_picture_url ?? null,
        followers:          igMeDirect.followers_count ?? 0,
        bio:                igMeDirect.biography ?? null,
        mediaCount:         igMeDirect.media_count ?? 0,
        status:             "connected",
        linkedPageId:       null,
        linkedPageName:     null,
        _pageToken:         longToken,
        metaLongLivedToken: longToken,
        tokenExpiresAt,
        lastError:          null,
        connectedAt:        now,
        updatedAt:          now,
        lastSyncAt:         now,
      }, { merge: true });

      totalContas++;
    }

    for (const page of pages) {
      const fbRef = db
        .collection("users").doc(uid)
        .collection("socialAccounts").doc(`fb_${page.id}`);

      batch.set(fbRef, {
        platform:           "facebook",
        platformId:         page.id,
        name:               page.name,
        handle:             page.name,
        avatar:             page.picture?.data?.url ?? null,
        followers:          page.fan_count ?? page.followers_count ?? 0,
        status:             "connected",
        category:           page.category ?? null,
        _pageToken:         page.access_token,
        metaLongLivedToken: longToken,
        tokenExpiresAt,
        lastError:          null,
        connectedAt:        now,
        updatedAt:          now,
        lastSyncAt:         now,
      }, { merge: true });

      totalContas++;

      if (page.instagram_business_account?.id) {
        const ig    = igByPageId[page.id];
        const igRef = db
          .collection("users").doc(uid)
          .collection("socialAccounts").doc(`ig_${page.instagram_business_account.id}`);

        batch.set(igRef, {
          platform:           "instagram",
          platformId:         page.instagram_business_account.id,
          name:               ig?.name ?? ig?.username ?? page.name,
          handle:             ig?.username ? `@${ig.username}` : null,
          avatar:             ig?.profile_picture_url ?? null,
          followers:          ig?.followers_count ?? 0,
          bio:                ig?.biography ?? null,
          mediaCount:         ig?.media_count ?? 0,
          status:             "connected",
          linkedPageId:       page.id,
          linkedPageName:     page.name,
          _pageToken:         page.access_token,
          metaLongLivedToken: longToken,
          tokenExpiresAt,
          lastError:          null,
          connectedAt:        now,
          updatedAt:          now,
          lastSyncAt:         now,
        }, { merge: true });

        totalContas++;
      }
    }

    await batch.commit();

    console.log(`[meta/callback] ✅ Firestore: ${totalContas} conta(s) salvas para uid=${uid}`);
    return NextResponse.redirect(`${appUrl}/contas?success=true&count=${totalContas}`);

  } catch (err) {
    console.error("[meta/callback] firestore_save_failed:", err);
    return NextResponse.redirect(`${appUrl}/contas?error=firestore_save_failed`);
  }
}
