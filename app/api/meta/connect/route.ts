// app/api/meta/connect/route.ts
// Inicia o fluxo OAuth da Meta. Recebe o idToken do Firebase,
// valida, gera um state anti-CSRF e redireciona ao diálogo de autorização.
import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

const API_VERSION = "v21.0";

// Escopos necessários para Instagram Business + Facebook Fan Page
// Nota: ads_read e read_insights requerem revisão da Meta para produção.
// Em desenvolvimento (com seu próprio usuário) funcionam normalmente.
const SCOPES = [
  "public_profile",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "ads_read",           // para Tráfego Pago
  "read_insights",      // para métricas de página
].join(",");

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  // ─── 1. Valida o idToken do Firebase ────────────────────────────────────────
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
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  // ─── 2. Gera state anti-CSRF (uid + timestamp + nonce) ─────────────────────
  const state = Buffer.from(
    JSON.stringify({
      uid,
      ts: Date.now(),
      nonce: Math.random().toString(36).slice(2),
    })
  ).toString("base64url");

  // ─── 3. Redireciona para o diálogo OAuth da Meta ───────────────────────────
  const redirectUri = `${appUrl}/api/meta/callback`;
  const authUrl =
    `https://www.facebook.com/${API_VERSION}/dialog/oauth` +
    `?client_id=${process.env.META_APP_ID!}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&state=${state}` +
    `&response_type=code`;

  console.log(`[meta/connect] uid=${uid} → redirecionando para Meta OAuth`);
  return NextResponse.redirect(authUrl);
}
