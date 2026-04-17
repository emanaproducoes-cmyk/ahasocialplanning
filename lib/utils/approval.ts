'use client';

/**
 * lib/utils/approval.ts
 *
 * Utilitários para o fluxo de aprovação de conteúdo.
 *
 * v2 – Changes:
 *  - generateApprovalLink agora produz URLs com rota dinâmica /aprovacao/[token]
 *    (friendly para OG tags / WhatsApp preview)
 *  - Adicionada getApprovalUrl() para reusar a lógica de URL em qualquer lugar
 *  - isApprovalExpired() aceita string ISO além de Firestore Timestamp
 *  - Toda a lógica original preservada
 */

import { doc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db }            from '@/lib/firebase/config';
import type { Approval, Post, Responsavel } from '@/lib/types';

export const APPROVAL_TTL_DAYS = 7;

// ─── URL ──────────────────────────────────────────────────────────────────────

function getBaseUrl(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? '';
}

/** Converte token → URL pública /aprovacao/[token] */
export function getApprovalUrl(token: string): string {
  return `${getBaseUrl()}/aprovacao/${token}`;
}

// ─── Geração de link ──────────────────────────────────────────────────────────

export async function generateApprovalLink(params: {
  uid:         string;
  postId:      string;
  post:        Partial<Post>;
  responsavel: Responsavel;
}): Promise<{ token: string; url: string }> {
  const { uid, postId, post, responsavel } = params;
  const token     = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + APPROVAL_TTL_DAYS * 24 * 60 * 60 * 1000);

  const approvalDoc: Omit<Approval, 'id' | 'comentario' | 'respondidoEm'> = {
    agendamentoId: postId,
    uid,
    creatives:     post.creatives ?? [],
    caption:       post.caption   ?? '',
    platforms:     post.platforms ?? [],
    status:        'pending',
    responsavel,
    createdAt:     serverTimestamp() as unknown as Timestamp,
    expiresAt:     Timestamp.fromDate(expiresAt),
  };

  await setDoc(doc(db, 'approvals', token), approvalDoc);

  // ✅ Apenas salva o token, NÃO muda o status do post
  await updateDoc(doc(db, `users/${uid}/posts/${postId}`), {
    approvalToken: token,
    updatedAt:     serverTimestamp(),
  });

  return { token, url: getApprovalUrl(token) };
}

// ─── Compartilhamento ─────────────────────────────────────────────────────────

export function buildWhatsAppLink(url: string, postTitle: string): string {
  const text = encodeURIComponent(
    `📋 *Aprovação de Conteúdo — AHA Social Planning*\n\n` +
    `Olá! Você tem um conteúdo aguardando sua aprovação:\n` +
    `*${postTitle}*\n\n` +
    `Acesse o link abaixo para aprovar, solicitar correção ou rejeitar:\n${url}\n\n` +
    `⏰ Link válido por ${APPROVAL_TTL_DAYS} dias.`
  );
  return `https://wa.me/?text=${text}`;
}

export function buildMailtoLink(url: string, postTitle: string, toEmail?: string): string {
  const subject = encodeURIComponent(`[AHA Social] Aprovação de conteúdo: ${postTitle}`);
  const body    = encodeURIComponent(
    `Olá,\n\nVocê tem um conteúdo aguardando aprovação na plataforma AHA Social Planning.\n\n` +
    `Post: ${postTitle}\n\n` +
    `Clique no link abaixo para acessar:\n${url}\n\n` +
    `⏰ Link válido por ${APPROVAL_TTL_DAYS} dias.\n\nAHA Social Planning`
  );
  return `mailto:${toEmail ?? ''}?subject=${subject}&body=${body}`;
}

// ─── Clipboard ────────────────────────────────────────────────────────────────

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity  = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  }
}

// ─── Validação ────────────────────────────────────────────────────────────────

/** Aceita Firestore Timestamp ou string ISO */
export function isApprovalExpired(expiresAt: Timestamp | string | null | undefined): boolean {
  if (!expiresAt) return false;
  if (typeof expiresAt === 'string') return new Date(expiresAt) < new Date();
  return (expiresAt as Timestamp).toDate() < new Date();
}
