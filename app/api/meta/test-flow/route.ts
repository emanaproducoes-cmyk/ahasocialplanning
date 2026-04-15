// app/api/meta/test-flow/route.ts
// Testa o fluxo OAuth da Meta de ponta a ponta SEM abrir o navegador.
// Cada etapa simula o que acontece na integração real e aponta o erro exato.
//
// USO: GET /api/meta/test-flow?secret=SEU_CRON_SECRET
// O CRON_SECRET é a variável de ambiente com o mesmo nome já usada no debug route.
//
// REMOVA ESTE ARQUIVO APÓS RESOLVER O PROBLEMA DE INTEGRAÇÃO.

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GRAPH = "https://graph.facebook.com/v21.0";

function norm(url: string) {
  return url.replace(/\/+$/, "");
}

async function graphFetch(url: string) {
  try {
    const res  = await fetch(url);
    const data = (await res.json()) as Record<string, unknown>;
    const err  = data.error as Record<string, unknown> | undefined;
    return {
      data,
      erro:       err ? `#${err.code ?? "?"} ${err.type ?? ""}: ${err.message ?? ""}`.trim() : null,
      statusHttp: res.status,
    };
  } catch (e) {
    return { data: {}, erro: `Exceção de rede: ${String(e)}`, statusHttp: 0 };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { erro: "Não autorizado — passe ?secret=SEU_CRON_SECRET" },
      { status: 401 }
    );
  }

  const rawUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const appUrl    = norm(rawUrl);
  const appId     = process.env.META_APP_ID ?? "";
  const appSecret = process.env.META_APP_SECRET ?? "";

  const R: Record<string, unknown> = {
    _titulo:    "Relatório End-to-End — Meta OAuth",
    _hora:      new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    _instrucao: "Leia cada ETAPA. Se há ❌ FALHA ou ⚠️ AVISO, siga a 'acao' indicada.",
  };

  // ── ETAPA 1: Variáveis de ambiente ──────────────────────────────────────────
  {
    const faltando = [];
    if (!appId)     faltando.push("META_APP_ID");
    if (!appSecret) faltando.push("META_APP_SECRET");
    if (!rawUrl)    faltando.push("NEXT_PUBLIC_APP_URL");

    const tinhaBarraFinal = rawUrl !== appUrl;

    if (faltando.length > 0) {
      R.etapa1_variaveis = {
        status:  "❌ FALHA",
        detalhe: `Variáveis ausentes no Vercel: ${faltando.join(", ")}`,
        acao:    "Adicione essas variáveis em Vercel → Settings → Environment Variables e faça redeploy.",
      };
    } else {
      R.etapa1_variaveis = {
        status:          tinhaBarraFinal ? "⚠️ AVISO" : "✅ OK",
        META_APP_ID:     appId,
        NEXT_PUBLIC_APP_URL_raw:  rawUrl,
        NEXT_PUBLIC_APP_URL_norm: appUrl,
        barra_final_removida:     tinhaBarraFinal
          ? `⚠️ SIM — a barra final foi removida. Corrija no Vercel para evitar problemas: "${appUrl}"`
          : "✅ Não",
        acao: tinhaBarraFinal
          ? `No Vercel, mude NEXT_PUBLIC_APP_URL de "${rawUrl}" para "${appUrl}" (sem a barra).`
          : undefined,
      };
    }
  }

  // ── ETAPA 2: App Access Token (testa META_APP_ID + META_APP_SECRET) ──────────
  let appToken: string | null = null;
  {
    if (!appId || !appSecret) {
      R.etapa2_app_token = { status: "❌ FALHA", detalhe: "Pulado — faltam credenciais (etapa 1)." };
    } else {
      const { data, erro } = await graphFetch(
        `${GRAPH}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`
      );
      if (erro || !data.access_token) {
        R.etapa2_app_token = {
          status:  "❌ FALHA",
          detalhe: erro ?? "access_token ausente na resposta da Meta",
          acao:    "META_APP_ID ou META_APP_SECRET estão incorretos. Verifique no painel Meta Developers → Configurações Básicas → App ID e Chave Secreta.",
        };
      } else {
        appToken = data.access_token as string;
        R.etapa2_app_token = {
          status:  "✅ OK",
          detalhe: `App Access Token gerado (tipo: ${data.token_type ?? "?"})`,
        };
      }
    }
  }

  // ── ETAPA 3: Info do App — modo Dev ou Live? ─────────────────────────────────
  let modoLive = false;
  {
    if (!appToken) {
      R.etapa3_modo_app = { status: "❌ FALHA", detalhe: "Pulado — sem App Token (etapa 2)." };
    } else {
      const { data, erro } = await graphFetch(
        `${GRAPH}/${appId}?fields=name,app_type,status,app_domains&access_token=${appToken}`
      );
      if (erro) {
        R.etapa3_modo_app = {
          status:  "⚠️ AVISO",
          detalhe: `Não foi possível verificar o modo do app: ${erro}`,
          acao:    "Verifique manualmente em Meta Developers se o app está em modo LIVE.",
        };
      } else {
        const status  = ((data.status as string) ?? "").toLowerCase();
        modoLive      = status === "live";
        const nome    = data.name as string ?? "?";
        const dominios = Array.isArray(data.app_domains) ? (data.app_domains as string[]).join(", ") : "nenhum";

        R.etapa3_modo_app = {
          status:   modoLive ? "✅ OK" : "⚠️ AVISO",
          app_nome: nome,
          app_modo: modoLive ? "LIVE ✅" : "DESENVOLVIMENTO ⚠️",
          dominios,
          detalhe:  modoLive
            ? `App "${nome}" em modo LIVE — qualquer usuário pode autorizar.`
            : `App "${nome}" em modo DESENVOLVIMENTO — APENAS você (dono do app) e testadores cadastrados conseguem autorizar. Outros usuários veem "Recurso indisponível" ou "Retorno OAuth inválido".`,
          acao: modoLive
            ? undefined
            : "Para testar com seu próprio usuário: OK. Para outros usuários: vá em Meta Developers → (seu app) → clique no toggle 'Em desenvolvimento' no topo da página → Ao Vivo.",
        };
      }
    }
  }

  // ── ETAPA 4: redirect_uri — o valor exato enviado ao Facebook ────────────────
  {
    const redirectUri = `${appUrl}/api/meta/callback`;

    const avisos = [];
    if (!redirectUri.startsWith("https://")) avisos.push("redirect_uri não começa com https://");
    if (redirectUri.includes("localhost"))   avisos.push("redirect_uri contém localhost — Meta rejeita em produção");
    if (redirectUri.includes("//api"))       avisos.push("redirect_uri tem barra dupla '//api' — barra extra no appUrl");

    R.etapa4_redirect_uri = {
      status:               avisos.length > 0 ? "❌ FALHA" : "✅ OK",
      redirect_uri_exata:   redirectUri,
      redirect_uri_encoded: encodeURIComponent(redirectUri),
      avisos:               avisos.length > 0 ? avisos : undefined,
      instrucao_meta:       `⚠️ Esta URI DEVE estar cadastrada exatamente em: Meta Developers → ${appId} → Facebook Login → Configurações → URIs de Redirecionamento OAuth Válidos`,
      acao: avisos.length > 0
        ? `Corrija os avisos acima. A URI cadastrada na Meta deve ser EXATAMENTE: "${redirectUri}"`
        : `Confirme que "${redirectUri}" está na lista de URIs válidas na Meta.`,
    };
  }

  // ── ETAPA 5: Round-trip do state ─────────────────────────────────────────────
  {
    const payload    = JSON.stringify({ uid: "usuario_teste", ts: Date.now(), nonce: "abc" });
    const encoded    = Buffer.from(payload, "utf-8").toString("base64");
    const urlEncoded = encodeURIComponent(encoded);

    // Simula o que Next.js faz: searchParams.get() faz URL-decode
    const stateRecebido = decodeURIComponent(urlEncoded);

    let ok = false;
    let uidRecuperado = "";
    try {
      const dec = Buffer.from(stateRecebido, "base64").toString("utf-8");
      const p   = JSON.parse(dec);
      ok = p.uid === "usuario_teste";
      uidRecuperado = p.uid;
    } catch {}

    R.etapa5_state_roundtrip = {
      status:        ok ? "✅ OK" : "❌ FALHA",
      payload_orig:  payload,
      base64:        encoded,
      url_encoded:   urlEncoded,
      apos_urldecode: stateRecebido,
      uid_recuperado: uidRecuperado || "FALHA",
      detalhe:       ok
        ? "Round-trip OK: encode (connect) → URL → decode (callback) funciona corretamente."
        : "Round-trip FALHOU: o state não sobrevive ao ciclo.",
    };
  }

  // ── ETAPA 6: URL OAuth completa (para testar no navegador) ───────────────────
  {
    const redirectUri = `${appUrl}/api/meta/callback`;
    const state       = encodeURIComponent(
      Buffer.from(JSON.stringify({ uid: "USUARIO_REAL_ID", ts: Date.now(), nonce: "test" }), "utf-8").toString("base64")
    );
    const scopes      = "public_profile,pages_show_list,pages_read_engagement,instagram_basic";

    if (appId && appUrl) {
      const oauthUrl =
        `https://www.facebook.com/v21.0/dialog/oauth` +
        `?client_id=${appId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&state=${state}` +
        `&response_type=code`;

      R.etapa6_url_oauth_teste = {
        status:  "✅ Gerada",
        detalhe: "Copie a url_para_testar e abra em aba anônima. Deve aparecer a tela de autorização do Facebook.",
        url_para_testar: oauthUrl,
        scopes_usados:   scopes,
        aviso: "Esta URL usa escopos mínimos. O state contém 'USUARIO_REAL_ID' (fictício) — o callback vai falhar no Firestore, mas isso é normal para teste. O importante é ver a tela do Facebook.",
      };
    } else {
      R.etapa6_url_oauth_teste = {
        status:  "❌ FALHA",
        detalhe: "Não foi possível gerar a URL — META_APP_ID ou NEXT_PUBLIC_APP_URL ausentes.",
      };
    }
  }

  // ── ETAPA 7: Firebase Admin ───────────────────────────────────────────────────
  {
    try {
      const { getAdminDb } = await import("@/lib/firebase/admin");
      const db = getAdminDb();
      await db.collection("_health").doc("check").get();
      R.etapa7_firebase = { status: "✅ OK", detalhe: "Firebase Admin conectado." };
    } catch (err) {
      const msg  = err instanceof Error ? err.message : String(err);
      const acao = msg.includes("private_key")
        ? "FIREBASE_PRIVATE_KEY com formato inválido. No Vercel, o valor deve ter \\n (barra-n literal), não quebras de linha reais."
        : "Verifique FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY no Vercel.";
      R.etapa7_firebase = { status: "❌ FALHA", detalhe: msg, acao };
    }
  }

  // ── SUMÁRIO ───────────────────────────────────────────────────────────────────
  const etapas = [
    R.etapa1_variaveis,
    R.etapa2_app_token,
    R.etapa3_modo_app,
    R.etapa4_redirect_uri,
    R.etapa5_state_roundtrip,
    R.etapa7_firebase,
  ] as Array<{ status: string }>;

  const nFalhas = etapas.filter((e) => e.status?.startsWith("❌")).length;
  const nAvisos = etapas.filter((e) => e.status?.startsWith("⚠️")).length;

  R.sumario = {
    falhas:     nFalhas,
    avisos:     nAvisos,
    conclusao:
      nFalhas > 0
        ? `❌ ${nFalhas} problema(s) crítico(s). Corrija as etapas com ❌ FALHA antes de testar o OAuth.`
        : nAvisos > 0
        ? `⚠️ ${nAvisos} aviso(s). O OAuth pode funcionar mas revise os ⚠️ AVISO, especialmente o modo do app (etapa 3).`
        : "✅ Tudo OK nos testes automáticos! Teste o OAuth com a URL da etapa 6 em aba anônima.",
    proximo_passo:
      nFalhas > 0
        ? "Corrija as etapas com ❌ e acesse este endpoint novamente."
        : "Copie a 'url_para_testar' da etapa 6 e abra em aba anônima no navegador.",
  };

  return NextResponse.json(R, {
    status:  200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
