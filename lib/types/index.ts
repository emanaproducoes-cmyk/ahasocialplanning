import type { Timestamp } from 'firebase/firestore';

// ─── AUTH ──────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'member';

export interface UserProfile {
  uid:        string;
  name:       string | null;
  email:      string | null;
  photoURL:   string | null;
  role:       UserRole;
  lastLogin:  Timestamp | null;
  createdAt:  Timestamp | null;
}

// ─── PLATFORMS ─────────────────────────────────────────────────────────────

export type Platform =
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'tiktok'
  | 'linkedin'
  | 'threads'
  | 'pinterest'
  | 'google_business';

export type PostFormat =
  | 'feed'
  | 'story'
  | 'reels'
  | 'shorts'
  | 'photo'
  | 'carrossel';

export interface PlatformMeta {
  id:       Platform;
  label:    string;
  color:    string;
  gradient: string;
  maxChars: number;
}

export const PLATFORMS: Record<Platform, PlatformMeta> = {
  instagram:       { id: 'instagram',       label: 'Instagram',          color: '#E1306C', gradient: 'gradient-ig',       maxChars: 2200 },
  facebook:        { id: 'facebook',        label: 'Facebook',           color: '#1877F2', gradient: 'gradient-fb',       maxChars: 63206 },
  youtube:         { id: 'youtube',         label: 'YouTube',            color: '#FF0000', gradient: 'gradient-yt',       maxChars: 5000 },
  tiktok:          { id: 'tiktok',          label: 'TikTok',             color: '#010101', gradient: 'gradient-tiktok',   maxChars: 2200 },
  linkedin:        { id: 'linkedin',        label: 'LinkedIn',           color: '#0A66C2', gradient: 'gradient-linkedin', maxChars: 3000 },
  threads:         { id: 'threads',         label: 'Threads',            color: '#000000', gradient: 'gradient-tiktok',   maxChars: 500 },
  pinterest:       { id: 'pinterest',       label: 'Pinterest',          color: '#E60023', gradient: 'gradient-yt',       maxChars: 500 },
  google_business: { id: 'google_business', label: 'Google Meu Negócio', color: '#4285F4', gradient: 'gradient-fb',       maxChars: 1500 },
};

// ─── CONNECTED ACCOUNTS ────────────────────────────────────────────────────

export type AccountStatus = 'ativo' | 'inativo' | 'pendente';

export interface ConnectedAccount {
  id:          string;
  platform:    Platform;
  name:        string;
  handle:      string;
  avatar:      string;
  followers:   number;
  engagement:  number;
  posts:       number;
  status:      AccountStatus;
  connectedAt: Timestamp | null;
  updatedAt:   Timestamp | null;

  // ── Campos Meta (Instagram / Facebook OAuth) ──────────────────────────────
  /** ID da conta Instagram Business ou Facebook Page na Graph API */
  metaAccountId?: string;
  /** ID da Facebook Page (necessário para Insights de IG) */
  metaPageId?:    string;
  /** ID da conta de anúncios (act_XXXXXXXXX) */
  adAccountId?:   string;
  /** Última sincronização com a Meta API */
  lastSyncedAt?:  Timestamp | null;
  /** Alcance (campo sincronizado via /sync) */
  reach?:         number;
  /** Impressões (campo sincronizado via /sync) */
  impressions?:   number;
  /** Bio do perfil (campo sincronizado via /sync) */
  biography?:     string;
  // Nota: _accessToken e _pageToken existem no Firestore mas são PRIVADOS
  // (prefixo _) e nunca devem ser retornados ao client.
}

// ─── POSTS / AGENDAMENTOS ──────────────────────────────────────────────────

export type PostStatus =
  | 'rascunho'
  | 'conteudo'
  | 'revisao'
  | 'aprovacao_cliente'
  | 'aprovado'
  | 'rejeitado'
  | 'publicado'
  | 'em_analise';

export type PostTag = 'Flow' | 'Fast' | 'Urgente' | 'Evergreen';

export interface Creative {
  url:        string;
  name:       string;
  type:       string;
  size:       number;
  uploadedAt: Timestamp | null;
}

export interface Responsavel {
  nome:   string;
  avatar: string;
  uid:    string;
}

export interface Post {
  id:            string;
  title:         string;
  caption:       string;
  hashtags:      string[];
  platforms:     Platform[];
  format:        PostFormat;
  creatives:     Creative[];
  scheduledAt:   Timestamp | null;
  status:        PostStatus;
  approvalToken: string | null;
  responsavel:   Responsavel | null;
  campaignId:    string | null;
  tags:          PostTag[];
  createdAt:     Timestamp | null;
  updatedAt:     Timestamp | null;
}

export interface PostHistoryEvent {
  id:        string;
  type:      'created' | 'edited' | 'status_change' | 'approval_sent' | 'approved' | 'rejected' | 'revision';
  label:     string;
  actor:     Responsavel;
  timestamp: Timestamp | null;
  meta:      Record<string, string> | null;
}

// ─── KANBAN ─────────────────────────────────────────────────────────────────

export interface KanbanColumn {
  id:     PostStatus;
  label:  string;
  color:  string;
  emoji:  string;
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'rascunho',          label: 'Rascunho',           color: '#9CA3AF', emoji: '⚪' },
  { id: 'conteudo',          label: 'Conteúdo',           color: '#7C3AED', emoji: '🟣' },
  { id: 'revisao',           label: 'Revisão',            color: '#F59E0B', emoji: '🟡' },
  { id: 'aprovacao_cliente', label: 'Aprovação Cliente',  color: '#3B82F6', emoji: '🔵' },
  { id: 'aprovado',          label: 'Aprovado',           color: '#22C55E', emoji: '🟢' },
  { id: 'rejeitado',         label: 'Rejeitados',         color: '#EF4444', emoji: '🔴' },
  { id: 'publicado',         label: 'Publicado',          color: '#FF5C00', emoji: '🚀' },
];

// ─── CAMPANHAS ─────────────────────────────────────────────────────────────

export type CampaignObjective = 'awareness' | 'consideracao' | 'conversao' | 'engajamento';
export type CampaignStatus    = 'ativa' | 'pausada' | 'concluida' | 'rascunho';

export interface CampaignKPIs {
  cpc:  number;
  cpm:  number;
  cac:  number;
  ctr:  number;
  roas: number;
}

export interface Campaign {
  id:               string;
  name:             string;
  description:      string;
  objective:        CampaignObjective;
  color:            string;
  tags:             string[];
  startDate:        Timestamp | null;
  endDate:          Timestamp | null;
  platforms:        Platform[];
  frequency:        number;
  budget:           number;
  budgetByPlatform: Record<string, number>;
  kpis:             Partial<CampaignKPIs>;
  status:           CampaignStatus;
  postsTotal:       number;
  postsApproved:    number;
  createdAt:        Timestamp | null;
  updatedAt:        Timestamp | null;
}

// ─── TRÁFEGO PAGO ──────────────────────────────────────────────────────────

export interface PaidTrafficEntry {
  id:           string;
  campaignId:   string;
  creativeId:   string;
  platform:     Platform;
  status:       'ativo' | 'pausado' | 'concluido';
  invested:     number;
  impressions:  number;
  reach:        number;
  clicks:       number;
  conversions:  number;
  cpc:          number;
  cpm:          number;
  ctr:          number;
  roas:         number;
  startDate:    Timestamp | null;
  endDate:      Timestamp | null;
}

// ─── APROVAÇÃO ─────────────────────────────────────────────────────────────

export type ApprovalStatus = 'pending' | 'aprovado' | 'rejeitado' | 'correcao';

export interface Approval {
  id:             string;
  agendamentoId:  string;
  uid:            string;
  creatives:      Creative[];
  caption:        string;
  platforms:      Platform[];
  status:         ApprovalStatus;
  responsavel:    Responsavel;
  comentario:     string | null;
  createdAt:      Timestamp | null;
  expiresAt:      Timestamp | null;
  respondidoEm:   Timestamp | null;
}

// ─── PREFERENCES ───────────────────────────────────────────────────────────

export type ViewMode = 'lista' | 'grade' | 'calendario';

export interface AppPreferences {
  viewModes: {
    agendamentos: ViewMode;
    posts:        ViewMode;
    campanhas:    ViewMode;
  };
  filters: {
    periodo:    string;
    plataforma: Platform | 'todas';
    tipo:       PostFormat | 'todos';
    status:     PostStatus | 'todos';
  };
  sidebarCollapsed: boolean;
  updatedAt:        Timestamp | null;
}

// ─── UI ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id:       string;
  message:  string;
  type:     ToastType;
  duration: number;
}

export type SyncStatus = 'online' | 'syncing' | 'offline';

// ─── DASHBOARD ─────────────────────────────────────────────────────────────

export interface DashboardKPIs {
  totalPosts:     number;
  aprovados:      number;
  emAnalise:      number;
  rejeitados:     number;
  postsVariation: number;
}

export interface PlatformStat {
  platform:  Platform;
  followers: number;
  variation: number;
}

export interface FunnelStep {
  label:      string;
  value:      number;
  percentage: number;
  icon:       string;
}

// ─── HELPERS ───────────────────────────────────────────────────────────────

export type WithId<T> = T & { id: string };
