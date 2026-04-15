// app/api/meta/connect/route.ts
// Inicia o fluxo OAuth da Meta.
// Valida o Firebase ID Token, gera state anti-CSRF e redireciona ao diálogo OAuth.

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

const API_VERSION = "v21.0";

const SCOPES_PROD = [
  "public_profile",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_insights",
  "read_insights",
].join(",");

const SCOPES_MIN = [
  "public_profile",
  "pages_show_list",
  "pages_read_engagement",
  "instagram_basic",
].join(",");

export async function GET(request: NextRequest) {
  // FIX #1: Normaliza appUrl removendo barra(s) final(is).
  // Evita redirect_uri = "https://dominio.com//api/meta/callback"
  // que não bate com o URI cadastrado na Meta sem a barra dupla.
  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const appUrl    = rawAppUrl.replace(/\/+$/, "");
  const appId     = process.env.META_APP_ID;

  if (!appUrl) {
    console.error("[meta/connect] NEXT_PUBLIC_APP_URL não definida");
    return NextResponse.json({ error: "Configuração do servidor incompleta (APP_URL)" }, { status: 500 });
  }
  if (!appId) {
    console.error("[meta/connect] META_APP_ID não definida");
    return NextResponse.json({ error: "Configuração do servidor incompleta (META_APP_ID)" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const idToken = searchParams.get("idToken");

  if (!idToken) {
    return NextResponse.json({ error: "idToken obrigatório" }, { status: 401 });
  }

  let uid: string;
  try {
    uid = await verifyIdToken(idToken);
  } catch (err) {
    console.error("[meta/connect] verifyIdToken falhou:", err);
    return NextResponse.json({ error: "Token Firebase inválido ou expirado" }, { status: 401 });
  }

  // FIX #2: State codificado em base64 padrão (sem base64url).
  // O base64url não tem padding (=) e usa - e _ que são URL-safe,
  // mas alguns proxies/CDNs podem reprocessar esses chars.
  // Usando base64 padrão + encodeURIComponent garante round-trip perfeito.
  const statePayload = JSON.stringify({
    uid,
    ts:    Date.now(),
    nonce: Math.random().toString(36).slice(2),
  });
  const state = Buffer.from(statePayload, "utf-8").toString("base64");

  // redirect_uri DEVE ser idêntica ao que está cadastrado na Meta.
  const redirectUri = `${appUrl}/api/meta/callback`;

  const useMinimal = searchParams.get("minimal") === "1";
  const scopes     = useMinimal ? SCOPES_MIN : SCOPES_PROD;

  // FIX #3: state agora passa por encodeURIComponent para garantir
  // que os chars = do base64 (padding) não quebrem a query string.
  const authUrl =
    `https://www.facebook.com/${API_VERSION}/dialog/oauth` +
    `?client_id=${appId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${encodeURIComponent(state)}` +
    `&response_type=code`;

  console.log(`[meta/connect] uid=${uid}`);
  console.log(`[meta/connect] redirectUri enviada à Meta: "${redirectUri}"`);
  console.log(`[meta/connect] NEXT_PUBLIC_APP_URL raw: "${rawAppUrl}"`);
  console.log(`[meta/connect] minimal=${useMinimal}`);

  return NextResponse.redirect(authUrl);
}
