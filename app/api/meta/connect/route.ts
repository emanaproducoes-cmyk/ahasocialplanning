// app/api/meta/connect/route.ts
// Inicia o fluxo OAuth da Meta.
// Valida o Firebase ID Token, gera state anti-CSRF e redireciona ao diálogo OAuth.
//
// CORREÇÕES v2:
//  - Escopos reduzidos para só o necessário (ads_read e business_management
//    requerem revisão da Meta para usuários que NÃO são o dono do app)
//  - Log detalhado do redirectUri para facilitar debug de "redirect_uri mismatch"
//  - Tratamento explícito de META_APP_ID ausente
import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

const API_VERSION = "v21.0";

// ── Escopos mínimos para Instagram Business + Facebook Pages ─────────────────
// IMPORTANTE: ads_read e business_management exigem revisão da Meta.
// Remova-os se sua conta de teste não for o dono do App Meta.
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

// Escopos mínimos para teste rápido (sem revisão da Meta)
const SCOPES_MIN = [
  "public_profile",
  "pages_show_list",
  "pages_read_engagement",
  "instagram_basic",
].join(",");

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const appId  = process.env.META_APP_ID;

  // ─── Proteção contra variáveis ausentes ─────────────────────────────────────
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

  // ─── 1. Valida idToken do Firebase ──────────────────────────────────────────
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

  // ─── 2. Gera state anti-CSRF ─────────────────────────────────────────────────
  const state = Buffer.from(
    JSON.stringify({
      uid,
      ts:    Date.now(),
      nonce: Math.random().toString(36).slice(2),
    })
  ).toString("base64url");

  // ─── 3. Monta URL de callback ────────────────────────────────────────────────
  // CRÍTICO: redirectUri DEVE estar cadastrado exatamente igual em:
  //   Meta Developers → Seu App → Facebook Login → Configurações → URIs de Redirecionamento OAuth Válidos
  const redirectUri = `${appUrl}/api/meta/callback`;

  // Usa escopos reduzidos se o parâmetro ?minimal=1 estiver presente (útil para debug)
  const useMinimal = searchParams.get("minimal") === "1";
  const scopes = useMinimal ? SCOPES_MIN : SCOPES_PROD;

  const authUrl =
    `https://www.facebook.com/${API_VERSION}/dialog/oauth` +
    `?client_id=${appId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${state}` +
    `&response_type=code`;

  console.log(`[meta/connect] uid=${uid} redirectUri=${redirectUri} minimal=${useMinimal}`);
  return NextResponse.redirect(authUrl);
}
