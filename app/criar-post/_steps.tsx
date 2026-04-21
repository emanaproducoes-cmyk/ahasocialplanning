'use client';

import { useState, useCallback, useRef } from 'react';
import { cn }                            from '@/lib/utils/cn';
import { formatFileSize }                from '@/lib/firebase/storage';
import { Play, Images, BookImage, X }    from 'lucide-react';
import type { Platform, PostFormat }     from '@/lib/types';

export interface FormatSelection {
  platform: Platform;
  format:   string;
}

export interface UploadItem {
  file:     File;
  preview:  string;
  progress: number;
  url:      string | null;
  error:    string | null;
}

export type Step = 1 | 2;

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORMS: { id: Platform; label: string; emoji: string }[] = [
  { id: 'instagram',       label: 'Instagram',          emoji: '📸' },
  { id: 'facebook',        label: 'Facebook',           emoji: '👍' },
  { id: 'tiktok',          label: 'TikTok',             emoji: '🎵' },
  { id: 'youtube',         label: 'YouTube',            emoji: '▶️' },
  { id: 'linkedin',        label: 'LinkedIn',           emoji: '💼' },
  { id: 'threads',         label: 'Threads',            emoji: '🧵' },
  { id: 'pinterest',       label: 'Pinterest',          emoji: '📌' },
  { id: 'google_business', label: 'Google Meu Negócio', emoji: '🏢' },
];

interface FormatOption {
  id:       PostFormat;
  label:    string;
  desc:     string;
  icon:     React.ReactNode;
  ratio:    string;
  maxFiles: number;
  accepts:  string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: 'feed', label: 'Feed / Post', desc: 'Imagem ou vídeo quadrado/paisagem',
    icon: <span className="text-xl">🖼️</span>, ratio: '1:1 / 4:5', maxFiles: 1,
    accepts: 'image/png,image/jpeg,image/jpg,video/mp4',
  },
  {
    id: 'carrossel', label: 'Carrossel', desc: 'Até 6 slides (imagens)',
    icon: <Images size={20} />, ratio: '1:1 / 4:5', maxFiles: 6,
    accepts: 'image/png,image/jpeg,image/jpg',
  },
  {
    id: 'story', label: 'Stories', desc: 'Vertical 9:16 — imagem ou vídeo',
    icon: <BookImage size={20} />, ratio: '9:16', maxFiles: 1,
    accepts: 'image/png,image/jpeg,image/jpg,video/mp4',
  },
  {
    id: 'reels', label: 'Reels / Shorts', desc: 'Vídeo vertical curto',
    icon: <Play size={20} fill="currentColor" />, ratio: '9:16', maxFiles: 1,
    accepts: 'video/mp4,video/webm',
  },
  {
    id: 'photo', label: 'Foto', desc: 'Imagem em qualquer proporção',
    icon: <span className="text-xl">📷</span>, ratio: 'livre', maxFiles: 1,
    accepts: 'image/png,image/jpeg,image/jpg,image/webp',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isVideoFile(f: File | UploadItem): boolean {
  const type = f instanceof File ? f.type : f.file.type;
  return type.startsWith('video');
}

// ─── VideoPreview — gera frame thumbnail do vídeo ─────────────────────────────

function VideoPreview({ src, className }: { src: string; className?: string }) {
  return (
    <div className={cn('relative bg-gray-900 overflow-hidden', className)}>
      <video
        src={src}
        className="w-full h-full object-cover"
        preload="metadata"
        muted
        playsInline
        onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).currentTime = 1; }}
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow">
          <Play size={12} className="text-gray-900 ml-0.5" fill="currentColor" />
        </div>
      </div>
    </div>
  );
}

// ─── FormatSelector ───────────────────────────────────────────────────────────

function FormatSelector({
  value, onChange,
}: {
  value: PostFormat; onChange: (f: PostFormat) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
        Formato do conteúdo *
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {FORMAT_OPTIONS.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all',
                active
                  ? 'border-[#FF5C00] bg-orange-50 text-[#FF5C00]'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-[#FF5C00]/40',
              )}
            >
              <span className={cn(active ? 'text-[#FF5C00]' : 'text-gray-500')}>{opt.icon}</span>
              <span className="text-[11px] font-semibold leading-tight">{opt.label}</span>
              <span className={cn('text-[10px] leading-tight', active ? 'text-orange-400' : 'text-gray-400')}>
                {opt.ratio}
              </span>
            </button>
          );
        })}
      </div>
      {/* Hint for selected format */}
      {value && (
        <p className="mt-2 text-xs text-gray-500">
          {FORMAT_OPTIONS.find((o) => o.id === value)?.desc}
          {value === 'carrossel' && ' — arraste para reordenar os slides'}
        </p>
      )}
    </div>
  );
}

// ─── UploadZone ───────────────────────────────────────────────────────────────

function UploadZone({
  format, uploads, onAddFiles, onRemove,
}: {
  format:     PostFormat;
  uploads:    UploadItem[];
  onAddFiles: (files: File[]) => void;
  onRemove:   (i: number) => void;
}) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const fmtOpt     = FORMAT_OPTIONS.find((o) => o.id === format) ?? FORMAT_OPTIONS[0];
  const maxFiles   = fmtOpt.maxFiles;
  const remaining  = maxFiles - uploads.length;
  const isCarrossel = format === 'carrossel';
  const isStory     = format === 'story' || format === 'reels';

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).slice(0, remaining);
    if (files.length) onAddFiles(files);
  }, [onAddFiles, remaining]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, remaining);
      onAddFiles(files);
    }
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
          Mídias {isCarrossel ? `(${uploads.length}/${maxFiles} slides)` : ''}
        </label>
        {isCarrossel && uploads.length > 0 && remaining > 0 && (
          <span className="text-xs text-gray-400">{remaining} slide(s) disponível</span>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-2">
        {fmtOpt.accepts.includes('video') ? 'PNG, JPG, MP4' : 'PNG, JPG'} — máx. 50 MB
        {isCarrossel && ` · até ${maxFiles} imagens`}
      </p>

      {/* Drop zone — só mostra se ainda há slots */}
      {remaining > 0 && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center hover:border-[#FF5C00]/40 hover:bg-orange-50/30 transition-all cursor-pointer"
        >
          <span className="text-3xl">{isCarrossel ? '🖼️' : isStory ? '📱' : '📁'}</span>
          <p className="text-sm text-gray-500 mt-2">
            Arraste aqui ou{' '}
            <span className="text-[#FF5C00] font-medium">clique para selecionar</span>
          </p>
          {isCarrossel && (
            <p className="text-xs text-gray-400 mt-1">Selecione até {remaining} imagem(ns) de uma vez</p>
          )}
          <input
            ref={inputRef}
            type="file"
            multiple={isCarrossel && remaining > 1}
            accept={fmtOpt.accepts}
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      )}
      {remaining === 0 && isCarrossel && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
          <p className="text-xs text-orange-700 font-medium">✅ Máximo de {maxFiles} slides atingido</p>
          <p className="text-[11px] text-orange-500 mt-0.5">Remova um slide para adicionar outro</p>
        </div>
      )}

      {/* Thumbnails grid */}
      {uploads.length > 0 && (
        <div className={cn(
          'mt-3 grid gap-2',
          isCarrossel
            ? 'grid-cols-3 sm:grid-cols-6'
            : isStory
            ? 'grid-cols-2'
            : 'grid-cols-3'
        )}>
          {uploads.map((item, i) => {
            const isVid = isVideoFile(item);
            return (
              <div
                key={i}
                className={cn(
                  'relative rounded-lg overflow-hidden bg-gray-100 border border-gray-200 group',
                  isStory ? 'aspect-[9/16]' : 'aspect-square'
                )}
              >
                {isVid
                  ? <VideoPreview src={item.preview} className="w-full h-full" />
                  // eslint-disable-next-line @next/next/no-img-element
                  : item.preview && <img src={item.preview} alt="" className="w-full h-full object-cover" />
                }

                {/* Progress overlay */}
                {item.progress < 100 && !item.url && !item.error && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                    <div className="w-3/4 bg-white/30 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-white rounded-full transition-all" style={{ width: `${item.progress}%` }} />
                    </div>
                    <p className="text-white text-[10px] mt-1">{item.progress}%</p>
                  </div>
                )}
                {item.url && (
                  <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px]">✓</div>
                )}
                {item.error && (
                  <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center p-1">
                    <p className="text-white text-[10px] text-center">{item.error}</p>
                  </div>
                )}

                {/* Slide number for carrossel */}
                {isCarrossel && (
                  <div className="absolute top-1 left-1 w-4 h-4 bg-black/60 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                    {i + 1}
                  </div>
                )}

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remover"
                >
                  <X size={10} />
                </button>

                {/* Filename */}
                <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] px-1 truncate">
                  {item.file.name} ({formatFileSize(item.file.size)})
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Step1Content ─────────────────────────────────────────────────────────────

export function Step1Content({
  platforms,
  onTogglePlatform,
  format, setFormat,
  title,      setTitle,
  caption,    setCaption,
  hashtags,   setHashtags,
  scheduledDate, setScheduledDate,
  uploads,
  onAddFiles,
  onRemoveFile,
  onNext,
}: {
  platforms:        Platform[];
  onTogglePlatform: (p: Platform) => void;
  format:           PostFormat;
  setFormat:        (f: PostFormat) => void;
  title:         string; setTitle:         (v: string) => void;
  caption:       string; setCaption:       (v: string) => void;
  hashtags:      string; setHashtags:      (v: string) => void;
  scheduledDate: string; setScheduledDate: (v: string) => void;
  uploads:       UploadItem[];
  onAddFiles:    (files: File[]) => void;
  onRemoveFile:  (i: number) => void;
  onNext:        () => void;
}) {
  const MAX_CHARS = 2200;
  const isStory   = format === 'story' || format === 'reels';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Criar novo post</h2>
        <p className="text-sm text-gray-500">Selecione as redes, formato e adicione as mídias</p>
      </div>

      {/* Plataformas */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
          Redes sociais *
        </label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => {
            const active = platforms.includes(p.id);
            return (
              <button key={p.id} type="button" onClick={() => onTogglePlatform(p.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  active ? 'bg-[#FF5C00] text-white border-[#FF5C00]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#FF5C00]/50'
                )}>
                <span>{p.emoji}</span>
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Formato */}
      <FormatSelector value={format} onChange={setFormat} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Esquerda */}
        <div className="space-y-4">
          {/* Título */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Título interno *
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Post produto X — semana 3"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]" />
          </div>

          {/* Data */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              📅 Data de publicação
            </label>
            <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]" />
          </div>

          {/* Upload com suporte a carrossel, story, vídeo */}
          <UploadZone
            format={format}
            uploads={uploads}
            onAddFiles={onAddFiles}
            onRemove={onRemoveFile}
          />

          {/* Legenda */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Legenda</label>
              <span className={cn('text-xs', caption.length > MAX_CHARS ? 'text-red-500' : 'text-gray-400')}>
                {caption.length}/{MAX_CHARS}
              </span>
            </div>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)}
              placeholder="Escreva a legenda do post..." rows={5}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]" />
          </div>

          {/* Hashtags */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Hashtags</label>
            <input value={hashtags} onChange={(e) => setHashtags(e.target.value)}
              placeholder="#marketing #socialmedia #conteudo"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]" />
          </div>
        </div>

        {/* Preview lado direito — proporcional ao formato */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Preview</p>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm max-w-[220px] mx-auto">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF5C00] to-[#FFB800]" />
              <div>
                <p className="text-xs font-semibold text-gray-900">sua_conta</p>
                <p className="text-[10px] text-gray-400">
                  {platforms.length > 0
                    ? platforms.map((p) => PLATFORMS.find((x) => x.id === p)?.emoji).join(' ')
                    : '📱'}
                </p>
              </div>
              <span className="ml-auto text-gray-400 text-lg">⋯</span>
            </div>

            {/* Media area — proportion changes by format */}
            <div className={cn(
              'bg-gray-100 flex items-center justify-center overflow-hidden relative',
              isStory        ? 'aspect-[9/16]' :
              format === 'carrossel' ? 'aspect-square' :
              'aspect-square'
            )}>
              {uploads[0]?.preview
                ? isVideoFile(uploads[0])
                  ? <VideoPreview src={uploads[0].preview} className="w-full h-full" />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={uploads[0].preview} alt="Preview" className="w-full h-full object-cover" />
                : <span className="text-5xl opacity-20">{isStory ? '📱' : format === 'carrossel' ? '🖼️' : '🖼️'}</span>
              }

              {/* Carrossel dots */}
              {format === 'carrossel' && uploads.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {uploads.map((_, i) => (
                    <div key={i} className={cn('w-1.5 h-1.5 rounded-full', i === 0 ? 'bg-white' : 'bg-white/50')} />
                  ))}
                </div>
              )}

              {/* Story badge */}
              {isStory && (
                <div className="absolute top-2 left-2 bg-gradient-to-r from-[#FF5C00] to-[#FFB800] text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  STORY
                </div>
              )}

              {/* Format badge */}
              <div className="absolute top-2 right-2 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                {FORMAT_OPTIONS.find((o) => o.id === format)?.ratio ?? '1:1'}
              </div>
            </div>

            {/* Social actions */}
            {!isStory && (
              <>
                <div className="px-3 py-2 flex items-center gap-3">
                  <span className="text-base">🤍</span><span className="text-base">💬</span><span className="text-base">➤</span>
                  <span className="ml-auto text-base">🔖</span>
                </div>
                <div className="px-3 pb-3">
                  {scheduledDate && (
                    <p className="text-[10px] text-gray-400 mb-1">📅 {new Date(scheduledDate + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                  )}
                  <p className="text-xs text-gray-900 line-clamp-2">
                    <span className="font-semibold">sua_conta </span>
                    {caption || <span className="text-gray-400 italic">Legenda aqui...</span>}
                  </p>
                  {hashtags && <p className="text-xs text-blue-500 mt-1 line-clamp-1">{hashtags}</p>}
                </div>
              </>
            )}
          </div>

          {/* Carrossel slide count info */}
          {format === 'carrossel' && uploads.length > 0 && (
            <p className="text-center text-xs text-gray-500 mt-2">
              {uploads.length} de 6 slides · Clique nos slides para ver todos
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button onClick={onNext} disabled={!title.trim() || platforms.length === 0}
          className="px-8 py-3 bg-[#FF5C00] hover:bg-[#E54E00] disabled:opacity-40 text-white font-medium rounded-xl transition-colors">
          Continuar →
        </button>
      </div>
    </div>
  );
}
