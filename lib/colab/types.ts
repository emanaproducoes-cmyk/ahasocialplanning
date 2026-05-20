// lib/colab/types.ts
// Tipos compartilhados do AHA Social Colab

export type ColabStatus = 'pending' | 'accepted' | 'expired';

export interface ColabInvite {
  id:          string;
  adminUid:    string;       // UID do social media (dono)
  adminEmail:  string;
  agencyName:  string;
  clientEmail: string;
  clientName:  string;
  status:      ColabStatus;
  createdAt:   string;       // ISO
  expiresAt:   string;       // ISO (+7 dias)
  token:       string;       // UUID único para o link
}

export interface ColabSession {
  inviteId:    string;
  adminUid:    string;
  adminEmail:  string;
  agencyName:  string;
  clientEmail: string;
  clientName:  string;
  acceptedAt:  string;
}

// ─── Planning ────────────────────────────────────────────────────────────────

export type PlanningPeriod = 'week' | 'month' | 'quarter' | 'semester';

export interface PlanningEntry {
  id:          string;
  adminUid:    string;
  period:      PlanningPeriod;
  periodLabel: string;       // "Semana 3 - Janeiro 2026", "Q1 2026", etc.
  theme:       string;
  emphasis:    string;
  notes:       string;
  createdAt:   string;
  updatedAt:   string;
}

// ─── Post (read-only view for client) ────────────────────────────────────────

export type PostStatus =
  | 'rascunho'
  | 'conteudo'
  | 'revisao'
  | 'aprovacao_cliente'
  | 'em_analise'
  | 'aprovado'
  | 'rejeitado'
  | 'publicado';

export type Platform =
  | 'instagram' | 'facebook' | 'tiktok'
  | 'youtube'   | 'linkedin' | 'threads'
  | 'pinterest' | 'google_business';

export interface ColabPost {
  id:          string;
  title:       string;
  caption?:    string;
  hashtags?:   string[];
  status:      PostStatus;
  platforms?:  Platform[];
  scheduledAt?: string;      // ISO
  creatives?:  { url: string; type?: string }[];
  campaignId?: string;
}

// ─── Rating / Gamification ───────────────────────────────────────────────────

export type RatingCategory =
  | 'themes'
  | 'titles'
  | 'digital_arts'
  | 'captions'
  | 'hashtags'
  | 'strategy'
  | 'frequency'
  | 'engagement'
  | 'visual_identity';

export const RATING_CATEGORIES: { id: RatingCategory; label: string; icon: string; description: string }[] = [
  { id: 'themes',         label: 'Temas',             icon: '🎯', description: 'Relevância e criatividade dos temas abordados'   },
  { id: 'titles',         label: 'Títulos',           icon: '✍️', description: 'Clareza e impacto dos títulos dos conteúdos'      },
  { id: 'digital_arts',   label: 'Artes Digitais',    icon: '🎨', description: 'Qualidade visual e identidade das peças criativas'},
  { id: 'captions',       label: 'Legendas',          icon: '💬', description: 'Engajamento e clareza das legendas'               },
  { id: 'hashtags',       label: 'Hashtags',          icon: '#️⃣', description: 'Relevância e alcance das hashtags utilizadas'     },
  { id: 'strategy',       label: 'Estratégia',        icon: '📊', description: 'Alinhamento com os objetivos do negócio'          },
  { id: 'frequency',      label: 'Frequência',        icon: '📅', description: 'Consistência e cadência das publicações'          },
  { id: 'engagement',     label: 'Engajamento',       icon: '❤️', description: 'Interação e resposta do público'                  },
  { id: 'visual_identity',label: 'Identidade Visual', icon: '🖼️', description: 'Coerência e reconhecimento da marca'              },
];

export interface ColabRating {
  id?:         string;
  adminUid:    string;
  clientEmail: string;
  month:       string;       // "2026-01"
  ratings:     Record<RatingCategory, number>;  // 1–5
  comment:     string;
  submittedAt: string;
}

// ─── Comment / Feedback on post ──────────────────────────────────────────────

export interface PostComment {
  id:          string;
  postId:      string;
  adminUid:    string;
  author:      'client' | 'admin';
  authorName:  string;
  text:        string;
  createdAt:   string;
}
