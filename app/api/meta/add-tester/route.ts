// app/api/meta/add-tester/route.ts
// Adiciona e-mails como testadores do app Meta via Graph API.
//
// Meta exige que a pessoa tenha uma conta Facebook com aquele e-mail
// e que aceite o convite no painel developers.facebook.com/requests.
//
// USO:
//   POST /api/meta/add-tester
//   Header: x-secret: SEU_CRON_SECRET
//   Body JSON: { "emails": ["joao@email.com", "maria@email.com"] }
//     -ou-
//   Body JSON: { "email": "joao@email.com" }
//
//   GET /api/meta/add-tester?secret=SEU_CRON_SECRET
//     → lista os testadores já cadastrados
//
// REMOVE ESTE ARQUIVO após o app ir para modo LIVE.

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GRAPH = "https://graph.facebook.com/v21.0";

function norm(url: string) {
  return url.replace(/\/+$/, "");
}

function authorized(request: NextRequest): boolean {
  const headerSecret = request.headers.get("x-secret");
  const querySecret  = new URL(request.url).searchParams.get("secret");
  const cronSecret   = process.env.CRON_SECRET ?? "";
  return !!(cronSecret && (headerSecret === cronSecret || querySecret === cronSecret));
}

async function getAppToken(appId: string, appSecret: string): Promise<string | null> {
  try {
    const res  = await fetch(
      `${GRAPH}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`
    );
    const data = (await res.json()) as { access_token?: string; error?: { message: string } };
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

// ─── GET: lista testadores ──────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json(
      { erro: "Não autorizado — passe ?secret=SEU_CRON_SECRET ou header x-secret" },
      { status: 401 }
    );
  }

  const appUrl    = norm(process.env.NEXT_PUBLIC_APP_URL ?? "");
  const appId     = process.env.META_APP_ID ?? "";
  const appSecret = process.env.META_APP_SECRET ?? "";

  if (!appId || !appSecret) {
    return NextResponse.json({ erro: "META_APP_ID ou META_APP_SECRET não configurados" }, { status: 500 });
  }

  const appToken = await getAppToken(appId, appSecret);
  if (!appToken) {
    return NextResponse.json(
      { erro: "Não foi possível obter App Access Token. Verifique META_APP_ID e META_APP_SECRET." },
      { status: 500 }
    );
  }

  // Busca testadores e desenvolvedores atuais
  const [testersRes, developersRes] = await Promise.all([
    fetch(`${GRAPH}/${appId}/testers?access_token=${appToken}`),
    fetch(`${GRAPH}/${appId}/roles?access_token=${appToken}`),
  ]);

  const testersData    = (await testersRes.json())    as { data?: { id: string; name: string }[]; error?: { message: string } };
  const developersData = (await developersRes.json()) as { data?: { id: string; name: string; role: string }[]; error?: { message: string } };

  return NextResponse.json({
    status: "✅ OK",
    app_id: appId,
    testadores: testersData.data ?? [],
    total_testadores: (testersData.data ?? []).length,
    outros_papeis: developersData.data ?? [],
    instrucao_convidar: {
      metodo: "POST",
      url:    `${appUrl}/api/meta/add-tester`,
      header: "x-secret: SEU_CRON_SECRET",
      body:   '{ "emails": ["email1@exemplo.com", "email2@exemplo.com"] }',
      aviso:  "A pessoa DEVE ter conta Facebook com esse e-mail e aceitar o convite em developers.facebook.com/requests",
    },
  });
}

// ─── POST: adiciona testadores ──────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json(
      { erro: "Não autorizado — envie header x-secret: SEU_CRON_SECRET" },
      { status: 401 }
    );
  }

  const appId     = process.env.META_APP_ID ?? "";
  const appSecret = process.env.META_APP_SECRET ?? "";

  if (!appId || !appSecret) {
    return NextResponse.json({ erro: "META_APP_ID ou META_APP_SECRET não configurados" }, { status: 500 });
  }

  // Parse do body
  let emails: string[] = [];
  try {
    const body = (await request.json()) as { email?: string; emails?: string[] };
    if (body.emails && Array.isArray(body.emails)) {
      emails = body.emails.map((e) => e.trim().toLowerCase()).filter(Boolean);
    } else if (body.email && typeof body.email === "string") {
      emails = [body.email.trim().toLowerCase()];
    }
  } catch {
    return NextResponse.json({ erro: 'Body JSON inválido. Exemplo: { "emails": ["a@b.com"] }' }, { status: 400 });
  }

  if (emails.length === 0) {
    return NextResponse.json(
      { erro: 'Nenhum e-mail fornecido. Envie { "emails": ["a@b.com", "b@b.com"] } ou { "email": "a@b.com" }' },
      { status: 400 }
    );
  }

  if (emails.length > 50) {
    return NextResponse.json({ erro: "Máximo de 50 e-mails por vez." }, { status: 400 });
  }

  // Validação simples de formato
  const invalidos = emails.filter((e) => !e.includes("@") || !e.includes("."));
  if (invalidos.length > 0) {
    return NextResponse.json({ erro: `E-mails com formato inválido: ${invalidos.join(", ")}` }, { status: 400 });
  }

  // App Access Token
  const appToken = await getAppToken(appId, appSecret);
  if (!appToken) {
    return NextResponse.json(
      { erro: "Não foi possível obter App Access Token. Verifique META_APP_ID e META_APP_SECRET." },
      { status: 500 }
    );
  }

  // Adiciona cada e-mail como testador em paralelo
  const resultados = await Promise.all(
    emails.map(async (email) => {
      try {
        const res = await fetch(`${GRAPH}/${appId}/testers`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            user:         email,
            access_token: appToken,
          }),
        });

        const data = (await res.json()) as {
          success?: boolean;
          error?: { message: string; code?: number; error_subcode?: number; type?: string };
        };

        if (data.success) {
          return {
            email,
            resultado: "✅ Convite enviado",
            detalhe:   "A pessoa deve aceitar o convite em developers.facebook.com/requests",
          };
        }

        const errMsg  = data.error?.message ?? "Erro desconhecido";
        const errCode = data.error?.code;

        let acao = "Tente novamente ou adicione manualmente em Meta Developers.";

        if (errCode === 100 || errMsg.includes("Invalid user id") || errMsg.includes("does not have a Facebook account")) {
          acao = "Nenhuma conta Facebook encontrada com esse e-mail. A pessoa precisa ter uma conta com exatamente esse endereço.";
        } else if (errCode === 200 || errMsg.includes("permission")) {
          acao = "Seu app não tem permissão. Certifique-se de usar o App Access Token do app correto.";
        } else if (errMsg.includes("already") || errMsg.includes("já")) {
          acao = "Usuário já é testador ou desenvolvedor deste app.";
        }

        return {
          email,
          resultado: "❌ Falha",
          erro:       errMsg,
          codigo:     errCode,
          acao,
        };
      } catch (err) {
        return {
          email,
          resultado: "❌ Erro de rede",
          erro:       err instanceof Error ? err.message : String(err),
        };
      }
    })
  );

  const sucesso  = resultados.filter((r) => r.resultado.startsWith("✅"));
  const falhas   = resultados.filter((r) => r.resultado.startsWith("❌"));

  return NextResponse.json({
    status:         falhas.length === 0 ? "✅ OK" : sucesso.length > 0 ? "⚠️ PARCIAL" : "❌ FALHA",
    total_enviados: emails.length,
    sucessos:       sucesso.length,
    falhas:         falhas.length,
    resultados,
    proximo_passo:
      sucesso.length > 0
        ? "Peça para a(s) pessoa(s) aceitarem o convite acessando: developers.facebook.com/requests — após aceitar, conseguem usar o OAuth com o app em modo desenvolvimento."
        : "Nenhum convite enviado. Veja os erros em 'resultados' e corrija.",
    aviso_modo_live:
      "Lembre: em modo DESENVOLVIMENTO apenas testadores cadastrados conseguem autorizar o app. Para todos os usuários, o app precisa estar em modo LIVE (ao vivo) no painel Meta Developers.",
  });
}
