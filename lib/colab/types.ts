export interface ColabInvite {
  id: string;
  token: string;
  adminUid: string;
  adminEmail: string;
  agencyName: string;
  clientEmail: string;
  clientName?: string;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
}

export interface ColabSession {
  token: string;
  adminUid: string;
  agencyName: string;
  clientEmail: string;
  clientName?: string;
  isActive: boolean;
}

export interface ColabPost {
  id: string;
  adminUid: string;
  date: string;
  title: string;
  caption?: string;
  contentType: 'reels' | 'carrossel' | 'story' | 'feed' | 'tiktok' | 'youtube';
  network: 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin';
  status: 'planejado' | 'em_producao' | 'aprovado' | 'publicado';
  theme?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ColabPlanning {
  id: string;
  adminUid: string;
  period: 'semana' | 'mes' | 'trimestre' | 'semestre';
  title: string;
  themes: string[];
  emphasis: string;
  startDate: string;
  endDate: string;
  notes?: string;
  updatedAt: Date;
}

export interface ColabRating {
  id: string;
  adminUid: string;
  month: string;
  themes: number;
  titles: number;
  digitalArts: number;
  captions: number;
  strategy: number;
  overall: number;
  comment?: string;
  createdAt: Date;
}
