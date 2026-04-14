// app/api/meta/connect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
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

    const appId = process.env.META_APP_ID!;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const redirectUri = `${appUrl}/api/meta/callback`;

    const statePayload = {
      uid,
      ts: Date.now(),
      nonce: Math.random().toString(36).slice(2),
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

    // Escopos corretos para Instagram Graph API (Facebook Login)
    // instagram_basic e instagram_content_publish estão DESCONTINUADOS
    const scopes = [
      "public_profile",
      "email",
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "instagram_business_basic",
      "instagram_business_content_publish",
      "instagram_business_manage_messages",
    ].join(",");

    const authUrl =
      `https://www.facebook.com/v22.0/dialog/oauth` +
      `?client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&state=${state}` +
      `&response_type=code`;

    return NextResponse.redirect(authUrl);
  } catch (err) {
    console.error("[meta/connect] Erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
