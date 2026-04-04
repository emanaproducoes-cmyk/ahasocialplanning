import { Timestamp } from 'firebase/firestore';
import { format, formatDistanceToNow, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── DATE ───────────────────────────────────────────────────────────────────

function toDate(value: Timestamp | Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date)      return value;
  const d = new Date(value);
  return isValid(d) ? d : null;
}

export function formatDate(
  value: Timestamp | Date | string | null | undefined,
  pattern = 'dd/MM/yyyy'
): string {
  const d = toDate(value);
  if (!d) return '—';
  return format(d, pattern, { locale: ptBR });
}

export function formatDateTime(
  value: Timestamp | Date | string | null | undefined
): string {
  return formatDate(value, "dd/MM/yyyy 'às' HH:mm");
}

export function formatRelative(
  value: Timestamp | Date | string | null | undefined
): string {
  const d = toDate(value);
  if (!d) return '—';
  return formatDistanceToNow(d, { locale: ptBR, addSuffix: true });
}

export function formatShortDate(
  value: Timestamp | Date | string | null | undefined
): string {
  return formatDate(value, 'dd MMM');
}

// ─── NUMBER ─────────────────────────────────────────────────────────────────

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('pt-BR');
}

export function formatCurrency(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

export function formatVariation(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

// ─── STRING ─────────────────────────────────────────────────────────────────

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function initials(name: string | null | undefined): string {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return (parts[0]?.[0] ?? '?').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

// ─── STATUS ─────────────────────────────────────────────────────────────────

import type { PostStatus, ApprovalStatus } from '@/lib/types';

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  rascunho:          'Rascunho',
  conteudo:          'Conteúdo',
  revisao:           'Revisão',
  aprovacao_cliente: 'Aprovação Cliente',
  aprovado:          'Aprovado',
  rejeitado:         'Rejeitado',
  publicado:         'Publicado',
  em_analise:        'Em Análise',
};

export const POST_STATUS_COLORS: Record<PostStatus, string> = {
  rascunho:          'bg-gray-100 text-gray-600',
  conteudo:          'bg-purple-100 text-purple-700',
  revisao:           'bg-yellow-100 text-yellow-700',
  aprovacao_cliente: 'bg-blue-100 text-blue-700',
  aprovado:          'bg-green-100 text-green-700',
  rejeitado:         'bg-red-100 text-red-700',
  publicado:         'bg-orange-100 text-orange-700',
  em_analise:        'bg-amber-100 text-amber-700',
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending:   'Aguardando',
  aprovado:  'Aprovado',
  rejeitado: 'Rejeitado',
  correcao:  'Correção Solicitada',
};
