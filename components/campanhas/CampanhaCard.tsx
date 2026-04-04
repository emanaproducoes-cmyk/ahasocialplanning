'use client';

import { useState }           from 'react';
import { cn }                 from '@/lib/utils/cn';
import { formatDate, formatCurrency, formatPercent } from '@/lib/utils/formatters';
import { ConfirmModal }       from '@/components/ui/Modal';
import { showToast }          from '@/components/ui/Toast';
import { removeDoc }          from '@/lib/firebase/firestore';
import type { Campaign }      from '@/lib/types';

const OBJECTIVE_LABELS: Record<Campaign['objective'], string> = {
  awareness:    'Reconhecimento',
  consideracao: 'Consideração',
  conversao:    'Conversão',
  engajamento:  'Engajamento',
};

const STATUS_STYLES: Record<Campaign['status'], string> = {
  ativa:     'bg-green-100 text-green-700',
  pausada:   'bg-amber-100 text-amber-700',
  concluida: 'bg-blue-100  text-blue-700',
  rascunho:  'bg-gray-100  text-gray-600',
};

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '👍', youtube: '▶️',
  tiktok: '🎵', linkedin: '💼', threads: '🧵',
};

interface CampanhaCardProps {
  campanha: Campaign;
  uid:      string;
  onEdit:   (campanha: Campaign) => void;
}

export function CampanhaCard({ campanha, uid, onEdit }: CampanhaCardProps) {
  const [showDetail,  setShowDetail]  = useState(false);
  const [confirmDel,  setConfirmDel]  = useState(false);

  const progress = campanha.postsTotal > 0
    ? Math.round((campanha.postsApproved / campanha.postsTotal) * 100)
    : 0;

  const handleDelete = async () => {
    await removeDoc(`users/${uid}/campanhas`, campanha.id);
    showToast('Campanha removida.', 'success');
  };

  return (
    <>
      <div
        className="bg-white rounded-xl shadow-card overflow-hidden hover:shadow-hover transition-all group"
        style={{ borderTop: `4px solid ${campanha.color ?? '#FF5C00'}` }}
      >
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate text-sm">{campanha.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{OBJECTIVE_LABELS[campanha.objective]}</p>
            </div>
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0', STATUS_STYLES[campanha.status])}>
              {campanha.status}
            </span>
          </div>

          {/* Description */}
          {campanha.description && (
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{campanha.description}</p>
          )}

          {/* Date range */}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>📅</span>
            <span>
              {campanha.startDate ? formatDate(campanha.startDate) : '—'}
              {' → '}
              {campanha.endDate ? formatDate(campanha.endDate) : '—'}
            </span>
          </div>

          {/* Posts progress */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-gray-500">Posts aprovados</span>
              <span className="font-semibold text-gray-800">
                {campanha.postsApproved}/{campanha.postsTotal}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width:      `${progress}%`,
                  background: campanha.color ?? '#FF5C00',
                }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5 text-right">{progress}%</p>
          </div>

          {/* Platforms */}
          {campanha.platforms?.length > 0 && (
            <div className="flex gap-1">
              {campanha.platforms.map((p) => (
                <span key={p} className="text-lg" title={p}>{PLATFORM_EMOJI[p] ?? '📱'}</span>
              ))}
            </div>
          )}

          {/* Budget */}
          {campanha.budget > 0 && (
            <div className="flex items-center justify-between pt-1 border-t border-gray-50">
              <span className="text-xs text-gray-500">Orçamento total</span>
              <span className="text-xs font-semibold text-gray-900">
                {formatCurrency(campanha.budget)}
              </span>
            </div>
          )}

          {/* Tags */}
          {campanha.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {campanha.tags.map((tag) => (
                <span key={tag} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowDetail(true)}
              className="flex-1 py-2 text-xs font-medium bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors"
            >
              Ver Detalhes
            </button>
            <button
              onClick={() => onEdit(campanha)}
              className="px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              title="Editar"
            >
              ✏️
            </button>
            <button
              onClick={() => setConfirmDel(true)}
              className="px-3 py-2 text-xs text-red-400 hover:bg-red-50 rounded-lg transition-colors"
              title="Excluir"
            >
              🗑
            </button>
          </div>
        </div>
      </div>

      {/* Detail slide-in */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowDetail(false)} />
          <div className="relative w-full max-w-sm bg-white shadow-modal overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <h2 className="font-semibold text-gray-900">{campanha.name}</h2>
              <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Objetivo',   value: OBJECTIVE_LABELS[campanha.objective] },
                  { label: 'Status',     value: campanha.status },
                  { label: 'Início',     value: campanha.startDate ? formatDate(campanha.startDate) : '—' },
                  { label: 'Término',    value: campanha.endDate   ? formatDate(campanha.endDate)   : '—' },
                  { label: 'Orçamento',  value: formatCurrency(campanha.budget) },
                  { label: 'Frequência', value: `${campanha.frequency} posts/semana` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-medium text-gray-800">{value}</p>
                  </div>
                ))}
              </div>

              {campanha.description && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Descrição</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{campanha.description}</p>
                </div>
              )}

              {/* KPIs metas */}
              {Object.keys(campanha.kpis ?? {}).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">KPIs Meta</p>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(campanha.kpis).map(([k, v]) => (
                      <div key={k} className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                        <p className="text-base font-bold text-gray-900">{v}</p>
                        <p className="text-[10px] text-gray-400 uppercase">{k}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDel}
        onClose={() => setConfirmDel(false)}
        onConfirm={handleDelete}
        title="Remover campanha"
        message={`Deseja remover "${campanha.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Sim, remover"
        danger
      />
    </>
  );
}
