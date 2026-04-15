// app/api/meta/debug/route.ts
// ROTA DE DIAGNÓSTICO — use apenas em desenvolvimento ou com a conta admin
// Verificar: GET /api/meta/debug?secret=SEU_CRON_SECRET
//
// REMOVA ESTE ARQUIVO EM PRODUÇÃO ou proteja com IP allowlist

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  // Protege a rota de diagnóstico
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const appId     = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL;

  const results: Record<string, unknown> = {};

  // ── 1. Checa variáveis de ambiente ──────────────────────────────────────────
  results.env = {
    META_APP_ID:              appId     ? `✅ definida (${appId})` : "❌ AUSENTE",
    META_APP_SECRET:          appSecret ? `✅ definida (${appSecret.slice(0, 4)}***${appSecret.slice(-4)})` : "❌ AUSENTE",
    NEXT_PUBLIC_APP_URL:      appUrl    ? `✅ ${appUrl}` : "❌ AUSENTE",
    FIREBASE_PROJECT_ID:      process.env.FIREBASE_PROJECT_ID      ? "✅" : "❌ AUSENTE",
    FIREBASE_CLIENT_EMAIL:    process.env.FIREBASE_CLIENT_EMAIL     ? "✅" : "❌ AUSENTE",
    FIREBASE_PRIVATE_KEY:     process.env.FIREBASE_PRIVATE_KEY      ? "✅ (começa com -----BEGIN)" : "❌ AUSENTE",
  };

  // ── 2. Checa redirect URI configurado ────────────────────────────────────────
  results.redirect_uri = `${appUrl}/api/meta/callback`;
  results.redirect_uri_note = "⚠️ Esta URI deve estar cadastrada EXATAMENTE assim em: Meta Developers → Seu App → Facebook Login → Configurações → URIs de Redirecionamento OAuth Válidos";

  // ── 3. Testa conectividade com a Graph API ───────────────────────────────────
  if (appId && appSecret) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${appId}` +
          `?fields=name,app_domains,redirect_uris` +
          `&access_token=${appId}|${appSecret}`
      );
      const data = await res.json();

      if (data.error) {
        results.meta_app_check = `❌ Erro: ${data.error.message} (code: ${data.error.code})`;
        results.meta_app_check_hint =
          data.error.code === 190
            ? "Token de app inválido. Verifique se META_APP_SECRET está correto."
            : data.error.code === 100
            ? "App ID inválido. Verifique META_APP_ID."
            : "Verifique as credenciais Meta.";
      } else {
        results.meta_app_check = `✅ App válido: "${data.name}"`;
        results.meta_app_domains = data.app_domains;
      }
    } catch (err) {
      results.meta_app_check = `❌ Erro de rede: ${err}`;
    }
  } else {
    results.meta_app_check = "⏭️ Pulado (META_APP_ID ou META_APP_SECRET ausentes)";
  }

  // ── 4. Checa Firebase Admin ──────────────────────────────────────────────────
  try {
    const { getAdminDb } = await import("@/lib/firebase/admin");
    const db = getAdminDb();
    // Tenta uma leitura simples
    await db.collection("_health").doc("check").get();
    results.firebase_admin = "✅ Conectado";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.firebase_admin = `❌ Erro: ${msg}`;
    results.firebase_admin_hint =
      msg.includes("private_key")
        ? "FIREBASE_PRIVATE_KEY com formato inválido. Certifique-se que \\n está escapado corretamente no Vercel."
        : msg.includes("project")
        ? "FIREBASE_PROJECT_ID incorreto."
        : "Verifique todas as variáveis FIREBASE_*.";
  }

  // ── 5. Instruções para corrigir no_pages_found ───────────────────────────────
  results.checklist_no_pages_found = [
    "1. A conta Facebook usada para autorizar TEM uma Página criada?",
    "   → Crie em: facebook.com/pages/create",
    "2. O Instagram é Conta Comercial ou Criador de Conteúdo?",
    "   → Instagram → Configurações → Conta → Mudar para conta profissional",
    "3. O Instagram está vinculado à Página do Facebook?",
    "   → Facebook → Sua Página → Configurações → Instagram → Conectar conta",
    "4. O Meta App está com a URI de redirect correta?",
    `   → Meta Developers → ${appId} → Facebook Login → Configurações → URIs Válidos`,
    `   → Deve conter: ${appUrl}/api/meta/callback`,
  ];

  return NextResponse.json(results, { status: 200 });
}
