import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

interface PublishBody {
  accountId: string;
  postId: string;
  caption: string;
  mediaUrl?: string;
  mediaType?: "IMAGE" | "VIDEO" | "REELS" | "CAROUSEL";
  carouselItems?: { url: string; type: "IMAGE" | "VIDEO" }[];
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    let uid: string;
    try {
      const decoded = await getAdminAuth().verifyIdToken(authHeader.replace("Bearer ", ""));
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const adminDb = getAdminDb();
    const body: PublishBody = await request.json();
    const { accountId, postId, caption, mediaUrl, mediaType = "IMAGE", carouselItems } = body;

    if (!accountId || !postId || !caption) {
      return NextResponse.json({ error: "accountId, postId e caption são obrigatórios" }, { status: 400 });
    }

    const accountSnap = await adminDb.collection("users").doc(uid).collection("socialAccounts").doc(accountId).get();
    if (!accountSnap.exists) {
      return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    }

    const account = accountSnap.data()!;
    const token: string = account._pageToken || account.metaLongLivedToken;
    const platformId: string = account.platformId;
    const platform: string = account.platform;
    let publishedId: string | null = null;

    if (platform === "instagram") {
      if (carouselItems && carouselItems.length > 1) {
        const itemIds: string[] = [];
        for (const item of carouselItems) {
          const itemRes = await fetch(`https://graph.facebook.com/v21.0/${platformId}/media`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [item.type === "VIDEO" ? "video_url" : "image_url"]: item.url, is_carousel_item: true, access_token: token }),
          });
          const itemData = await itemRes.json();
          if (itemData.error) throw new Error(`Carousel item error: ${itemData.error.message}`);
          itemIds.push(itemData.id);
        }
        const carouselRes = await fetch(`https://graph.facebook.com/v21.0/${platformId}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ media_type: "CAROUSEL", children: itemIds.join(","), caption, access_token: token }),
        });
        const carouselData = await carouselRes.json();
        if (carouselData.error) throw new Error(carouselData.error.message);
        const publishRes = await fetch(`https://graph.facebook.com/v21.0/${platformId}/media_publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creation_id: carouselData.id, access_token: token }),
        });
        const publishData = await publishRes.json();
        if (publishData.error) throw new Error(publishData.error.message);
        publishedId = publishData.id;
      } else {
        const containerBody: Record<string, string> = { caption, access_token: token };
        if (mediaUrl) {
          if (mediaType === "VIDEO" || mediaType === "REELS") {
            containerBody.video_url = mediaUrl;
            containerBody.media_type = mediaType;
          } else {
            containerBody.image_url = mediaUrl;
          }
        }
        const containerRes = await fetch(`https://graph.facebook.com/v21.0/${platformId}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(containerBody),
        });
        const containerData = await containerRes.json();
        if (containerData.error) throw new Error(containerData.error.message);
        if (mediaType === "VIDEO" || mediaType === "REELS") {
          await waitForContainer(platformId, containerData.id, token);
        }
        const publishRes = await fetch(`https://graph.facebook.com/v21.0/${platformId}/media_publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creation_id: containerData.id, access_token: token }),
        });
        const publishData = await publishRes.json();
        if (publishData.error) throw new Error(publishData.error.message);
        publishedId = publishData.id;
      }
    }

    if (platform === "facebook") {
      const fbBody: Record<string, string> = { message: caption, access_token: token };
      const endpoint = mediaUrl ? `https://graph.facebook.com/v21.0/${platformId}/photos` : `https://graph.facebook.com/v21.0/${platformId}/feed`;
      if (mediaUrl) fbBody.url = mediaUrl;
      const fbRes = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fbBody) });
      const fbData = await fbRes.json();
      if (fbData.error) throw new Error(fbData.error.message);
      publishedId = fbData.post_id || fbData.id;
    }

    if (postId) {
      await adminDb.collection("users").doc(uid).collection("posts").doc(postId).update({
        status: "published",
        publishedAt: new Date(),
        externalPostId: publishedId,
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({ success: true, publishedId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[meta/publish] Erro:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function waitForContainer(igUserId: string, containerId: string, token: string, maxWaitMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(`https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${token}`);
    const data = await res.json();
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR") throw new Error("Falha no processamento do vídeo");
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("Timeout aguardando processamento do vídeo");
}
