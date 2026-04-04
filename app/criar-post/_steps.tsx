'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter }                     from 'next/navigation';
import { useAuth }                       from '@/lib/hooks/useAuth';
import { useUserCollection }             from '@/lib/hooks/useCollection';
import { saveDoc }                       from '@/lib/firebase/firestore';
import { uploadCreative, formatFileSize } from '@/lib/firebase/storage';
import { showToast }                     from '@/components/ui/Toast';
import { cn }                            from '@/lib/utils/cn';
import { serverTimestamp }               from 'firebase/firestore';
import { generateApprovalLink }          from '@/lib/utils/approval';
import type { Post, Platform, PostFormat, ConnectedAccount, Responsavel, Creative } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3;

interface FormatSelection {
  platform: Platform;
  format:   PostFormat;
}

interface UploadItem {
  file:     File;
  preview:  string;
  progress: number;
  url:      string | null;
  error:    string | null;
}

// ─── Platform format options ──────────────────────────────────────────────────
const PLATFORM_FORMATS: Record<Platform, { label: string; emoji: string; formats: { id: PostFormat; label: string; icon: string }[] }> = {
  instagram:       { label: 'Instagram',          emoji: '📸', formats: [{ id: 'feed', label: 'Feed', icon: '🖼️' }, { id: 'story', label: 'Story', icon: '📱' }, { id: 'reels', label: 'Reels', icon: '🎬' }] },
  facebook:        { label: 'Facebook',           emoji: '👍', formats: [{ id: 'feed', label: 'Feed', icon: '🖼️' }, { id: 'story', label: 'Story', icon: '📱' }, { id: 'reels', label: 'Reels', icon: '🎬' }] },
  threads:         { label: 'Threads',            emoji: '🧵', formats: [{ id: 'feed', label: 'Feed', icon: '🖼️' }] },
  youtube:         { label: 'YouTube',            emoji: '▶️', formats: [{ id: 'shorts', label: 'Shorts', icon: '🎬' }] },
  tiktok:          { label: 'TikTok',             emoji: '🎵', formats: [{ id: 'feed', label: 'Feed', icon: '🖼️' }, { id: 'photo', label: 'Photo', icon: '📷' }] },
  linkedin:        { label: 'LinkedIn',           emoji: '💼', formats: [{ id: 'feed', label: 'Feed', icon: '🖼️' }] },
  pinterest:       { label: 'Pinterest',          emoji: '📌', formats: [{ id: 'feed', label: 'Feed', icon: '🖼️' }] },
  google_business: { label: 'Google Meu Negócio', emoji: '🏢', formats: [{ id: 'feed', label: 'Feed', icon: '🖼️' }] },
};

// ─── Step 1 — Formats ─────────────────────────────────────────────────────────
function Step1Formats({
  connectedAccounts,
  selected,
  onToggle,
  onNext,
}: {
  connectedAccounts: ConnectedAccount[];
  selected:  FormatSelection[];
  onToggle:  (platform: Platform, format: PostFormat) => void;
  onNext:    () => void;
}) {
  const isSelected = (p: Platform, f: PostFormat) =>
    selected.some((s) => s.platform === p && s.format === f);

  const platforms = connectedAccounts.length > 0
    ? connectedAccounts.map((a) => a.platform)
    : (['instagram', 'facebook', 'threads', 'youtube', 'tiktok', 'linkedin'] as Platform[]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Onde você gostaria de criar seus posts?
        </h2>
        <p className="text-sm text-gray-500">
          Selecione abaixo os tipos de posts das redes conectadas
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {platforms.map((platform) => {
          const meta = PLATFORM_FORMATS[platform];
          if (!meta) return null;
          return (
            <div key={platform} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Platform header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <span className="text-xl">{meta.emoji}</span>
                <span className="text-sm font-semibold text-gray-800">{meta.label}</span>
              </div>
              {/* Formats */}
              <div className="p-3 space-y-2">
                {meta.formats.map((fmt) => {
                  const checked = isSelected(platform, fmt.id);
                  return (
                    <label
                      key={fmt.id}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all',
                        checked
                          ? 'bg-orange-50 border border-[#FF5C00]/30'
                          : 'border border-transparent hover:bg-gray-50'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggle(platform, fmt.id)}
                        className="w-4 h-4 accent-[#FF5C00] rounded"
                      />
                      <span className="text-lg">{fmt.icon}</span>
                      <span className="text-sm text-gray-700 font-medium">{fmt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={onNext}
          disabled={selected.length === 0}
          className="px-8 py-3 bg-[#FF5C00] hover:bg-[#E54E00] disabled:opacity-40 text-white font-medium rounded-xl transition-colors"
        >
          Continuar →
        </button>
      </div>
    </div>
  );
}

// ─── Step 2 — Content ─────────────────────────────────────────────────────────
function Step2Content({
  selected,
  title,      setTitle,
  caption,    setCaption,
  hashtags,   setHashtags,
  uploads,
  onAddFiles,
  onBack,
  onNext,
}: {
  selected:    FormatSelection[];
  title:       string; setTitle:   (v: string) => void;
  caption:     string; setCaption: (v: string) => void;
  hashtags:    string; setHashtags:(v: string) => void;
  uploads:     UploadItem[];
  onAddFiles:  (files: File[]) => void;
  onBack:      () => void;
  onNext:      () => void;
}) {
  const dropRef = useRef<HTMLDivElement>(null);
  const [activePlatform] = useState<FormatSelection | null>(selected[0] ?? null);
  const MAX_CHARS = 2200;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    onAddFiles(files);
  }, [onAddFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) onAddFiles(Array.from(e.target.files));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Conteúdo do post</h2>
        <p className="text-sm text-gray-500">Adicione mídias e escreva a legenda</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left: Inputs ── */}
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Título interno *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Post produto X — semana 3"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]"
            />
          </div>

          {/* Media upload */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Mídias
            </label>
            <p className="text-xs text-gray-400 mb-2">Formatos suportados: PNG, JPG, JPEG, MP4</p>

            <div
              ref={dropRef}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[#FF5C00]/40 hover:bg-orange-50/30 transition-all cursor-pointer"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <span className="text-3xl">📁</span>
              <p className="text-sm text-gray-500 mt-2">
                Arraste arquivos aqui ou <span className="text-[#FF5C00] font-medium">clique para selecionar</span>
              </p>
              <input
                id="file-input"
                type="file"
                multiple
                accept="image/png,image/jpeg,image/jpg,video/mp4"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>

            {/* Upload previews */}
            {uploads.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {uploads.map((item, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                    {item.preview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.preview} alt="" className="w-full h-full object-cover" />
                    )}
                    {item.progress < 100 && (
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                        <div className="w-3/4 bg-white/30 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-white rounded-full transition-all"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <p className="text-white text-[10px] mt-1">{item.progress}%</p>
                      </div>
                    )}
                    {item.error && (
                      <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center p-1">
                        <p className="text-white text-[10px] text-center">{item.error}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Caption */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Legenda / Descrição
              </label>
              <span className={cn('text-xs', caption.length > MAX_CHARS ? 'text-red-500' : 'text-gray-400')}>
                {caption.length}/{MAX_CHARS}
              </span>
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Escreva a legenda do post... (Digite / para variáveis)"
              rows={5}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]"
            />
          </div>

          {/* Hashtags */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Hashtags
            </label>
            <input
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#marketing #socialmedia #conteudo"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]"
            />
          </div>
        </div>

        {/* ── Right: Preview ── */}
        <div className="space-y-3">
          {activePlatform && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Preview — {PLATFORM_FORMATS[activePlatform.platform]?.label}
              </p>

              {/* Instagram-style mockup */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-card max-w-xs mx-auto">
                {/* Profile bar */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF5C00] to-[#FFB800]" />
                  <div>
                    <p className="text-xs font-semibold text-gray-900">sua_conta</p>
                    <p className="text-[10px] text-gray-400">Patrocinado</p>
                  </div>
                  <span className="ml-auto text-gray-400 text-lg">⋯</span>
                </div>

                {/* Media area */}
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  {uploads[0]?.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={uploads[0].preview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl opacity-20">🖼️</span>
                  )}
                </div>

                {/* Actions */}
                <div className="px-3 py-2 flex items-center gap-3">
                  <span className="text-xl">🤍</span>
                  <span className="text-xl">💬</span>
                  <span className="text-xl">➤</span>
                  <span className="ml-auto text-xl">🔖</span>
                </div>

                {/* Caption preview */}
                <div className="px-3 pb-3">
                  <p className="text-xs text-gray-900 line-clamp-3">
                    <span className="font-semibold">sua_conta </span>
                    {caption || <span className="text-gray-400 italic">Sua legenda aparecerá aqui...</span>}
                  </p>
                  {hashtags && (
                    <p className="text-xs text-blue-500 mt-1 line-clamp-2">{hashtags}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
        >
          ← Voltar
        </button>
        <button
          onClick={onNext}
          disabled={!title.trim()}
          className="px-8 py-3 bg-[#FF5C00] hover:bg-[#E54E00] disabled:opacity-40 text-white font-medium rounded-xl transition-colors"
        >
          Continuar →
        </button>
      </div>
    </div>
  );
}

export { Step1Formats, Step2Content };
export type { FormatSelection, UploadItem, Step };
