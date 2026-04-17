/**
 * app/aprovacao/[token]/page.tsx
 *
 * Página PÚBLICA de aprovação — acessível sem login.
 * Suporta rota dinâmica /aprovacao/[token] E query string ?token=...
 *
 * Features:
 *  - OG Meta Tags para preview rico no WhatsApp / redes sociais
 *  - Carrossel de creatives com navegação
 *  - Campo de comentário
 *  - Botões: Aprovar | Solicitar Correção | Rejeitar
 *  - Responsivo mobile-first
 *  - Identidade visual AHA (laranja #FF5C00 + roxo #7C3AED)
 */

import { Suspense }           from 'react';
import type { Metadata }      from 'next';
import { getAdminDb }         from '@/lib/firebase/admin';
import type { Approval }      from '@/lib/types';
import AprovacaoClient        from './AprovacaoClient';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface PageProps {
  params:      { token: string };
  searchParams?: Record<string, string | string[] | undefined>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getApprovalData(token: string): Promise<(Approval & { id: string }) | null> {
  try {
    const adminDb = getAdminDb();
    const snap    = await adminDb.doc(`approvals/${token}`).get();
    if (!snap.exists) return null;
    const data = snap.data()!;
    // Converter Timestamps para JSON-serializable
    return {
      id:            snap.id,
      agendamentoId: data['agendamentoId'] ?? '',
      uid:           data['uid'] ?? '',
      creatives:     data['creatives'] ?? [],
      caption:       data['caption'] ?? '',
      platforms:     data['platforms'] ?? [],
      status:        data['status'] ?? 'pending',
      responsavel:   data['responsavel'] ?? { nome: '', avatar: '', uid: '' },
      comentario:    data['comentario'] ?? '',
      // Timestamps são convertidos para milissegundos para evitar erro de serialização
      createdAt:     data['createdAt']?.toDate?.().toISOString() ?? null,
      expiresAt:     data['expiresAt']?.toDate?.().toISOString() ?? null,
      respondidoEm:  data['respondidoEm']?.toDate?.().toISOString() ?? null,
    } as unknown as Approval & { id: string };
  } catch {
    return null;
  }
}

// ─── generateMetadata — OG Tags para WhatsApp/redes ──────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const token    = params.token;
  const approval = await getApprovalData(token);

  const title       = 'AHA Social Planning — Aprovação de Conteúdo';
  const description = approval
    ? `${approval.responsavel?.nome ?? 'Equipe'} enviou um conteúdo para sua aprovação. Clique para visualizar e responder.`
    : 'Conteúdo aguardando aprovação.';

  const imageUrl = approval?.creatives?.[0]?.url ?? null;
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.ahasocial.com.br';
  const pageUrl  = `${appUrl}/aprovacao/${token}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url:    pageUrl,
      type:   'website',
      locale: 'pt_BR',
      ...(imageUrl
        ? { images: [{ url: imageUrl, width: 1200, height: 630, alt: 'Preview do conteúdo' }] }
        : {}),
    },
    twitter: {
      card:        imageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
    robots: { index: false, follow: false },
  };
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

function PageSpinner() {
  return (
    <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center">
      <div className="w-10 h-10 border-[3px] border-orange-200 border-t-[#FF5C00] rounded-full animate-spin" />
    </div>
  );
}

// ─── Page (Server Component) ──────────────────────────────────────────────────

export default async function AprovacaoTokenPage({ params }: PageProps) {
  const token    = params.token;
  const approval = await getApprovalData(token);

  return (
    <Suspense fallback={<PageSpinner />}>
      <AprovacaoClient token={token} initialApproval={approval} />
    </Suspense>
  );
}
