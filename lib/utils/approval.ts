'use client';

import { doc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Approval, Post, Responsavel } from '@/lib/types';

const APPROVAL_TTL_DAYS = 7;

/**
 * Generates a UUID-based approval token and creates the /approvals/{token} document.
 * Returns the public URL for sharing.
 */
export async function generateApprovalLink(params: {
  uid:        string;
  postId:     string;
  post:       Partial<Post>;
  responsavel: Responsavel;
}): Promise<{ token: string; url: string }> {
  const { uid, postId, post, responsavel } = params;

  const token     = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + APPROVAL_TTL_DAYS * 24 * 60 * 60 * 1000);
  const baseUrl   = typeof window !== 'undefined'
    ? `${window.location.origin}/aprovacao`
    : '';

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

  // Update the post document
  await updateDoc(doc(db, `users/${uid}/posts/${postId}`), {
    approvalToken: token,
    status:        'em_analise',
    updatedAt:     serverTimestamp(),
  });

  return { token, url: `${baseUrl}?token=${token}` };
}

/**
 * Builds share text for WhatsApp.
 */
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

/**
 * Builds a mailto: link for sharing via email.
 */
export function buildMailtoLink(url: string, postTitle: string, toEmail?: string): string {
  const subject = encodeURIComponent(`[AHA Social] Aprovação de conteúdo: ${postTitle}`);
  const body    = encodeURIComponent(
    `Olá,\n\nVocê tem um conteúdo aguardando aprovação na plataforma AHA Social Planning.\n\n` +
    `Post: ${postTitle}\n\n` +
    `Clique no link abaixo para acessar:\n${url}\n\n` +
    `⏰ Link válido por ${APPROVAL_TTL_DAYS} dias.\n\n` +
    `AHA Social Planning`
  );
  return `mailto:${toEmail ?? ''}?subject=${subject}&body=${body}`;
}

/**
 * Copies text to clipboard and returns success boolean.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
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

/**
 * Checks whether an approval document is expired.
 */
export function isApprovalExpired(expiresAt: Timestamp | null): boolean {
  if (!expiresAt) return false;
  return expiresAt.toDate() < new Date();
}
