// app/api/meta/diagnose/route.ts
// Diagnóstico COMPLETO do fluxo OAuth da Meta.
// Simula cada etapa sem abrir o navegador — mostra o que seria enviado ao Facebook.
//
// USO: GET /api/meta/diagnose?secret=SEU_CRON_SECRET
// Protegido por CRON_SECRET (mesmo segredo do debug route).
//
// REMOVA OU DESABILITE EM PRODUÇÃO APÓS RESOLVER O PROBLEMA.

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ── Mesmo normalize do connect/route.ts ──────────────────────────────────────
function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

// ── Simula geração do state (igual ao connect/route.ts corrigido) ─────────────
function buildSampleState(uid = "uid_de_teste_diagnostico"): {
  raw: string;
  encoded: string;
  decoded: string;
  roundTripOk: boolean;
} {
  const payload = JSON.stringify({ uid, ts: Date.now(), nonce: "diag1234" });
  const encoded = Buffer.from(payload, "utf-8").toString("base64");
  const encodedForUrl = encodeURIComponent(encoded);

  // Simula o que o callback recebe: searchParams.get("state") faz URL-decode automaticamente
  const stateFromUrl = decodeURIComponent(encodedForUrl);

  // Simula o decode do callback
  let roundTripOk = false;
  let decoded = "";
  try {
    decoded = Buffer.from(stateFromUrl, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    roundTripOk = parsed.uid === uid && typeof parsed.ts === "number";
  } catch {
    decoded = "ERRO ao decodificar";
  }

  return { raw: payload, encoded: encodedForUrl, decoded, roundTripOk };
}

// ── Testa troca de token com a Graph API ──────────────────────────────────────
async function testAppToken(appId: string, appSecret: string) {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token` +
        `?client_id=${appId}` +
        `&client_secret=${appSecret}` +
        `&grant_type=client_credentials`
    );
    const data = await res.json() as Record<string, unknown>;
    if (data.error) {
      return { ok: false, detail: `Erro ${(data.error as Record<string,unknown>).code}: ${(data.error as Record<string,unknown>).message}` };
    }
    return { ok: true, detail: `App token gerado com sucesso (type: ${data.token_type ?? "?"})` };
  } catch (err) {
    return { ok: false, detail: `Exceção de rede: ${String(err)}` };
  }
}

// ── Verifica URI cadastrada no app Meta ───────────────────────────────────────
async function checkMetaApp(appId: string, appSecret: string) {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${appId}` +
        `?fields=name,link,app_type` +
        `&access_token=${appId}|${appSecret}`
    );
    const data = await res.json() as Record<string, unknown>;
    if (data.error) {
      return {
        ok: false,
        name: null,
        detail: `Erro ${(data.error as Record<string,unknown>).code}: ${(data.error as Record<string,unknown>).message}`,
      };
    }
    return { ok: true, name: data.name as string, detail: `App tipo: ${data.app_type ?? "desconhecido"}` };
  } catch (err) {
    return { ok: false, name: null, detail: `Exceção: ${String(err)}` };
  }
}

// ── Rota principal ────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado — passe ?secret=SEU_CRON_SECRET" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};
  results._titulo = "Diagnóstico Completo do OAuth Meta";
  results._hora   = new Date().toISOString();

  // ── ETAPA 1: Variáveis de ambiente ──────────────────────────────────────────
  const rawAppUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const appUrl       = normalizeUrl(rawAppUrl);
  const appId        = process.env.META_APP_ID ?? "";
  const appSecret    = process.env.META_APP_SECRET ?? "";

  results.etapa1_variaveis = {
    NEXT_PUBLIC_APP_URL_raw:     rawAppUrl     || "❌ AUSENTE",
    NEXT_PUBLIC_APP_URL_norm:    appUrl        || "❌ AUSENTE",
    tinha_barra_final:           rawAppUrl !== appUrl ? `⚠️ SIM — removida ("${rawAppUrl}" → "${appUrl}")` : "✅ Não",
    META_APP_ID:                 appId         ? `✅ ${appId}` : "❌ AUSENTE",
    META_APP_SECRET:             appSecret     ? `✅ ${appSecret.slice(0, 4)}****${appSecret.slice(-4)} (${appSecret.length} chars)` : "❌ AUSENTE",
    FIREBASE_PROJECT_ID:         process.env.FIREBASE_PROJECT_ID    ? "✅" : "❌ AUSENTE",
    FIREBASE_CLIENT_EMAIL:       process.env.FIREBASE_CLIENT_EMAIL  ? "✅" : "❌ AUSENTE",
    FIREBASE_PRIVATE_KEY:        process.env.FIREBASE_PRIVATE_KEY   ? "✅" : "❌ AUSENTE",
  };

  // ── ETAPA 2: Construção da redirect_uri ─────────────────────────────────────
  const redirectUri = `${appUrl}/api/meta/callback`;

  results.etapa2_redirect_uri = {
    redirect_uri_gerada:         redirectUri,
    redirect_uri_encoded:        encodeURIComponent(redirectUri),
    instrucao:                   `⚠️ Esta URI EXATA deve estar em: Meta Developers → ${appId || "SEU_APP"} → Facebook Login → Configurações → URIs de Redirecionamento OAuth Válidos`,
    aviso_https:                 redirectUri.startsWith("https://") ? "✅ Começa com https://" : "❌ PROBLEMA: não começa com https://",
    aviso_localhost:             redirectUri.includes("localhost")   ? "⚠️ Contém localhost — Meta não aceita localhost em produção"   : "✅ Sem localhost",
  };

  // ── ETAPA 3: Simulação do state (round-trip encode → decode) ────────────────
  const stateTest = buildSampleState("uid_diagnostico_123");

  results.etapa3_state_roundtrip = {
    estado_original:             stateTest.raw,
    state_encodado:              stateTest.encoded,
    decode_no_callback_ok:       stateTest.roundTripOk ? "✅ Round-trip OK" : "❌ FALHA no round-trip",
    state_decodado:              stateTest.decoded,
    explicacao:                  "O state é codificado em base64 + encodeURIComponent no connect, e decodificado com URLSearchParams.get (auto URL-decode) + base64 no callback.",
  };

  // ── ETAPA 4: URL OAuth completa que seria gerada ────────────────────────────
  const SCOPES_MIN = "public_profile,pages_show_list,pages_read_engagement,instagram_basic";

  if (appId && appUrl) {
    const sampleState = encodeURIComponent(
      Buffer.from(JSON.stringify({ uid: "USUARIO_ID", ts: Date.now(), nonce: "abc123" }), "utf-8").toString("base64")
    );

    const oauthUrl =
      `https://www.facebook.com/v21.0/dialog/oauth` +
      `?client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(SCOPES_MIN)}` +
      `&state=${sampleState}` +
      `&response_type=code`;

    results.etapa4_oauth_url = {
      url_completa:              oauthUrl,
      instrucao:                 "Teste esta URL diretamente no navegador (sem estar logado no app) para ver o que o Facebook mostra.",
      client_id:                 appId,
      redirect_uri:              redirectUri,
      scopes:                    SCOPES_MIN,
    };
  } else {
    results.etapa4_oauth_url = { erro: "Não foi possível gerar — META_APP_ID ou NEXT_PUBLIC_APP_URL ausentes." };
  }

  // ── ETAPA 5: Teste real de credenciais com a Graph API ──────────────────────
  if (appId && appSecret) {
    const [appTokenTest, appInfoTest] = await Promise.all([
      testAppToken(appId, appSecret),
      checkMetaApp(appId, appSecret),
    ]);

    results.etapa5_credenciais_meta = {
      app_token:                 appTokenTest.ok ? `✅ ${appTokenTest.detail}` : `❌ ${appTokenTest.detail}`,
      app_info:                  appInfoTest.ok  ? `✅ App: "${appInfoTest.name}" — ${appInfoTest.detail}` : `❌ ${appInfoTest.detail}`,
      conclusao:                 appTokenTest.ok && appInfoTest.ok
        ? "✅ Credenciais META_APP_ID e META_APP_SECRET estão corretas."
        : "❌ Problema com as credenciais Meta — verifique META_APP_ID e META_APP_SECRET no Vercel.",
    };
  } else {
    results.etapa5_credenciais_meta = { pulado: "META_APP_ID ou META_APP_SECRET ausentes." };
  }

  // ── ETAPA 6: Diagnóstico do Firebase Admin ───────────────────────────────────
  try {
    const { getAdminDb } = await import("@/lib/firebase/admin");
    const db = getAdminDb();
    await db.collection("_health").doc("check").get();
    results.etapa6_firebase = "✅ Firebase Admin conectado com sucesso.";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.etapa6_firebase = `❌ Erro Firebase: ${msg}`;
  }

  // ── ETAPA 7: Checklist final ─────────────────────────────────────────────────
  const hasTrailingSlash = rawAppUrl !== appUrl;
  const redirectUriOk    = redirectUri.startsWith("https://") && !redirectUri.includes("localhost");

  results.etapa7_checklist_final = {
    "1_url_sem_barra_final":     !hasTrailingSlash ? "✅ OK" : `❌ CORRIGIR: remova a barra final de NEXT_PUBLIC_APP_URL no Vercel`,
    "2_redirect_uri_valida":     redirectUriOk     ? "✅ OK" : "❌ PROBLEMA com a redirect_uri",
    "3_state_roundtrip":         stateTest.roundTripOk ? "✅ OK" : "❌ FALHA: state não sobrevive ao encode/decode",
    "4_redirect_uri_no_meta":    `⚠️ Verifique MANUALMENTE: "${redirectUri}" deve estar em Meta Developers → Facebook Login → Configurações`,
    "5_app_modo_dev_ou_live":    `⚠️ Verifique MANUALMENTE: Se o app Meta está em modo DESENVOLVIMENTO, só você (dono) consegue autorizar. Para outros usuários, precisa estar em modo LIVE.`,
  };

  return NextResponse.json(results, {
    status:  200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
