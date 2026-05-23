export type PlanningPeriod = 'day' | 'week' | 'month' | 'quarter' | 'semester';

export interface PlanningEntry {
  id:          string;
  adminUid:    string;
  period:      PlanningPeriod;
  periodLabel: string;
  theme:       string;
  emphasis:    string;
  notes:       string;
  createdAt:   string;
  updatedAt:   string;
}

export type PostStatus =
  | 'rascunho' | 'conteudo' | 'revisao'
  | 'aprovacao_cliente' | 'em_analise'
  | 'aprovado' | 'rejeitado' | 'publicado';

export type Platform =
  | 'instagram' | 'facebook' | 'tiktok'
  | 'youtube' | 'linkedin' | 'threads'
  | 'pinterest' | 'google_business';

export interface ColabPost {
  id:           string;
  adminUid:     string;
  title:        string;
  caption?:     string;
  hashtags?:    string[];
  status:       PostStatus;
  platforms?:   Platform[];
  scheduledAt?: string;
  creatives?:   { url: string; type?: string; name?: string }[];
  mediaUrl?:    string;
  fileUrl?:     string;
  fileType?:    string;
  campaignId?:  string;
}

export interface PostComment {
  id:        string;
  postId:    string;
  adminUid:  string;
  author:    string;
  text:      string;
  createdAt: string;
}

export interface ColabSession {
  inviteId:    string;
  adminUid:    string;
  adminEmail:  string;
  agencyName:  string;
  clientEmail: string;
  clientName:  string;
  acceptedAt:  string;
  canCreate?:  boolean;
}
