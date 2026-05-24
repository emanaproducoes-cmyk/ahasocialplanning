'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isToday,
  addMonths, subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { collection, query, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { ColabSession, ColabPost, PostComment } from '@/lib/colab/types';

/* ── Status config ──────────────────────────────────────────── */
const STATUS: Record<string, { label: string; dot: string; pill: string; text: string }> = {
  rascunho:          { label: 'Rascunho',    dot: '#64748B', pill: 'rgba(100,116,139,0.12)', text: '#334155' },
  conteudo:          { label: 'Conteúdo',    dot: '#3B82F6', pill: 'rgba(59,130,246,0.13)',  text: '#1D4ED8' },
  revisao:           { label: 'Revisão',     dot: '#D97706', pill: 'rgba(217,119,6,0.13)',   text: '#92400E' },
  aprovacao_cliente: { label: 'Ap. Cliente', dot: '#8B5CF6', pill: 'rgba(139,92,246,0.13)', text: '#5B21B6' },
  em_analise:        { label: 'Em Análise',  dot: '#6366F1', pill: 'rgba(99,102,241,0.13)', text: '#3730A3' },
  aprovado:          { label: 'Aprovado',    dot: '#10B981', pill: 'rgba(16,185,129,0.13)', text: '#047857' },
  rejeitado:         { label: 'Rejeitado',   dot: '#EF4444', pill: 'rgba(239,68,68,0.13)',  text: '#B91C1C' },
  publicado:         { label: 'Publicado',   dot: '#0EA5E9', pill: 'rgba(14,165,233,0.13)', text: '#0369A1' },
};
const STATUS_OPTIONS = Object.entries(STATUS).map(([id, cfg]) => ({ id, ...cfg }));

const PLATFORM_ICON: Record<string, string> = {
  instagram: '📸', facebook: '👍', youtube: '▶️', tiktok: '🎵',
  linkedin: '💼', threads: '🧵', pinterest: '📌', google_business: '🏢',
};
const ALL_PLATFORMS = ['instagram','facebook','youtube','tiktok','linkedin','threads','pinterest','google_business'];
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface Props { session: ColabSession }

export default function ColabCalendar({ session }: Props) {
  
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);
  const [month, setMonth]       = useState(new Date());
  const [posts, setPosts]       = useState<ColabPost[]>([]);
  const [selected, setSelected] = useState<ColabPost | null>(null);
  const [newDay, setNewDay]     = useState<Date | null>(null);
  const [view, setView]         = useState<'month' | 'list'>('month');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading]   = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users', session.adminUid, 'posts'));
      const snap = await getDocs(q);
      const items: ColabPost[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          adminUid: session.adminUid,
          title: data.title ?? '',
          caption: data.caption,
          hashtags: data.hashtags,
          status: data.status ?? 'rascunho',
          platforms: data.platforms,
          scheduledAt: data.scheduledAt?.toDate?.()?.toISOString?.() ?? data.scheduledAt,
          creatives: data.creatives,
          mediaUrl: data.creatives?.[0]?.url ?? data.mediaUrl ?? data.fileUrl,
          fileType: (data.creatives?.[0]?.type ?? '').includes('video') ? 'video' : 'image',
          campaignId: data.campaignId,
        } as ColabPost;
      });
      setPosts(items);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, [session.adminUid]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end   = endOfWeek(endOfMonth(month),     { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const postsByDay = useMemo(() => {
    const map: Record<string, ColabPost[]> = {};
    posts.forEach(p => {
      if (!p.scheduledAt) return;
      const k = format(new Date(p.scheduledAt), 'yyyy-MM-dd');
      if (!map[k]) map[k] = [];
      map[k].push(p);
    });
    return map;
  }, [posts]);

  const filtered = filterStatus === 'all' ? posts : posts.filter(p => p.status === filterStatus);
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    posts.forEach(p => { c[p.status] = (c[p.status] ?? 0) + 1; });
    return c;
  }, [posts]);

  return (
    <div style={{ padding: '6px', minHeight: 120 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 21, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 2 }}>
            Calendário de Conteúdo
          </h2>
          <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>
            {format(month, "MMMM 'de' yyyy", { locale: ptBR })} · {loading ? '…' : posts.length} posts agendados
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, padding: 3, background: '#FFFFFF', borderRadius: 10, border: '1px solid #E2E8F0' }}>
          {(['month', 'list'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '5px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              background: view === v ? '#0F172A' : 'transparent',
              color: view === v ? '#F8FAFC' : '#64748B',
              transition: 'all 0.15s',
            }}>
              {v === 'month' ? '📅 Mês' : '📋 Lista'}
            </button>
          ))}
        </div>
      </div>

      {/* Status pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        <button onClick={() => setFilterStatus('all')} style={{
          padding: '4px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          background: filterStatus === 'all' ? '#0F172A' : '#FFFFFF',
          color: filterStatus === 'all' ? '#F8FAFC' : '#64748B',
          outline: filterStatus === 'all' ? 'none' : '1px solid #E2E8F0',
        }}>
          Todos ({posts.length})
        </button>
        {Object.entries(statusCounts).map(([s, count]) => {
          const cfg = STATUS[s]; if (!cfg) return null;
          const active = filterStatus === s;
          return (
            <button key={s} onClick={() => setFilterStatus(s === filterStatus ? 'all' : s)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              background: active ? cfg.pill : '#FFFFFF',
              color: active ? cfg.text : '#64748B',
              outline: `1px solid ${active ? cfg.dot + '60' : '#E2E8F0'}`,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {view === 'month' ? (
        <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {/* Nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid #E2E8F0', background: '#FFFFFF' }}>
            <button onClick={() => setMonth(m => subMonths(m, 1))}
              style={{ background: 'none', border: '1px solid #E2E8F0', cursor: 'pointer', color: '#64748B', fontSize: 16, padding: '3px 9px', borderRadius: 7 }}>‹</button>
            <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 14, color: '#0F172A', textTransform: 'capitalize', margin: 0 }}>
              {format(month, "MMMM yyyy", { locale: ptBR })}
            </h3>
            <button onClick={() => setMonth(m => addMonths(m, 1))}
              style={{ background: 'none', border: '1px solid #E2E8F0', cursor: 'pointer', color: '#64748B', fontSize: 16, padding: '3px 9px', borderRadius: 7 }}>›</button>
          </div>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
            {DAYS.map(d => (
              <div key={d} style={{ padding: '8px 6px', textAlign: 'center', fontSize: 10, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {d}
              </div>
            ))}
          </div>
          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
            {days.map((day, idx) => {
              const key      = format(day, 'yyyy-MM-dd');
              const dayPosts = (postsByDay[key] ?? []).filter(p => filterStatus === 'all' || p.status === filterStatus);
              const inMonth  = isSameMonth(day, month);
              const isT      = isToday(day);
              return (
                <div key={key}
                  onClick={() => inMonth && setNewDay(day)}
                  style={{
                    minHeight: 90, padding: '8px 6px 6px',
                    borderBottom: idx < days.length - 7 ? '1px solid #E2E8F0' : 'none',
                    borderRight: (idx + 1) % 7 !== 0 ? '1px solid #E2E8F0' : 'none',
                    background: isT ? 'rgba(79,70,229,0.05)' : '#FFFFFF',
                    opacity: inMonth ? 1 : 0.4,
                    cursor: inMonth ? 'pointer' : 'default',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => inMonth && (e.currentTarget.style.background = isT ? 'rgba(79,70,229,0.08)' : '#F8FAFC')}
                  onMouseLeave={e => (e.currentTarget.style.background = isT ? 'rgba(79,70,229,0.05)' : '#FFFFFF')}
                >
                  <div style={{
                    fontSize: 12, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700,
                    color: isT ? '#4F46E5' : inMonth ? '#0F172A' : '#CBD5E1',
                    marginBottom: 4, textAlign: 'right', paddingRight: 2,
                  }}>
                    {isT ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: '#4F46E5', color: '#fff', fontSize: 11 }}>
                        {format(day, 'd')}
                      </span>
                    ) : format(day, 'd')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayPosts.slice(0, 2).map(p => {
                      const cfg = STATUS[p.status] ?? STATUS.rascunho;
                      return (
                        <div key={p.id}
                          onClick={e => { e.stopPropagation(); setSelected(p); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 5px', borderRadius: 4, background: cfg.pill, cursor: 'pointer' }}>
                          {p.mediaUrl ? (
                            <img src={p.mediaUrl} alt="" style={{ width: "100%", height: 56, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                          ) : (
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                          )}
                          <span style={{ fontSize: 10, fontWeight: 600, color: cfg.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                            {p.title}
                          </span>
                        </div>
                      );
                    })}
                    {dayPosts.length > 2 && (
                      <div style={{ fontSize: 9, color: '#64748B', fontWeight: 700, textAlign: 'right', paddingRight: 2 }}>
                        +{dayPosts.length - 2}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 && !loading && (
            <div style={{ textAlign: 'center', color: '#64748B', padding: 48, fontSize: 14 }}>Nenhum post encontrado.</div>
          )}
          {filtered
            .slice().sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''))
            .map(p => {
              const cfg = STATUS[p.status] ?? STATUS.rascunho;
              return (
                <div key={p.id} onClick={() => setSelected(p)} style={{
                  borderRadius: 12, padding: '13px 18px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: '#FFFFFF', border: '1px solid #E2E8F0',
                  transition: 'box-shadow 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 9, overflow: 'hidden', flexShrink: 0, background: cfg.pill, border: `1px solid ${cfg.dot}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {p.mediaUrl ? (
                      <img src={p.mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 999, background: cfg.pill, color: cfg.text, fontSize: 10, fontWeight: 700 }}>{cfg.label}</span>
                      {p.platforms?.slice(0, 3).map(pl => <span key={pl} style={{ fontSize: 13 }}>{PLATFORM_ICON[pl] ?? '📱'}</span>)}
                    </div>
                  </div>
                  {p.scheduledAt && (
                    <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'Plus Jakarta Sans, sans-serif', flexShrink: 0, textAlign: 'right', fontWeight: 600 }}>
                      {format(new Date(p.scheduledAt), "dd MMM", { locale: ptBR })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {selected && (
        <PostModal post={selected} session={session}
          onClose={() => setSelected(null)}
          onUpdated={() => { setSelected(null); reload(); }}
          onDeleted={() => { setSelected(null); reload(); }}
        />
      )}
      {newDay && (
        <DayModal
          day={newDay}
          existingPosts={postsByDay[format(newDay, 'yyyy-MM-dd')] ?? []}
          session={session}
          onClose={() => setNewDay(null)}
          onSaved={() => { reload(); setNewDay(null); }}
          onViewPost={p => { setNewDay(null); setSelected(p); }}
        />
      )}

      {/* Lightbox */}
      {zoomedImg && (
        <div onClick={() => setZoomedImg(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, cursor: 'zoom-out'
        }}>
          <img src={zoomedImg} alt="" style={{
            maxWidth: '90vw', maxHeight: '90vh',
            borderRadius: 12, objectFit: 'contain',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)'
          }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setZoomedImg(null)} style={{
            position: 'absolute', top: 20, right: 24,
            background: 'rgba(255,255,255,0.15)', border: 'none',
            borderRadius: '50%', width: 36, height: 36,
            color: '#fff', fontSize: 20, cursor: 'pointer'
          }}>×</button>
        </div>
      )}
    </div>
  );
}

/* ── DAY MODAL — lista posts do dia + criar/solicitar ───────── */
function DayModal({ day, existingPosts, session, onClose, onSaved, onViewPost }: {
  day: Date; existingPosts: ColabPost[]; session: ColabSession;
  onClose: () => void; onSaved: () => void; onViewPost: (p: ColabPost) => void;
}) {
  const [mode, setMode]       = useState<'list' | 'create' | 'request'>(existingPosts.length > 0 ? 'list' : (session.canCreate ? 'create' : 'request'));
  const [title, setTitle]     = useState('');
  const [caption, setCaption] = useState('');
  const [status, setStatus]   = useState('rascunho');
  const [platforms, setPlatforms] = useState<string[]>(['instagram']);
  const [saving, setSaving]   = useState(false);
  const [requestNote, setRequestNote] = useState('');
  const [requested, setRequested] = useState(false);

  const dateLabel = format(day, "EEEE, dd 'de' MMMM", { locale: ptBR });

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'users', session.adminUid, 'posts'), {
        title: title.trim(), caption: caption.trim(), status, platforms,
        scheduledAt: day.toISOString(), hashtags: [],
        createdByClient: true,
        clientName: session.clientName,
        createdAt: new Date().toISOString(),
      });
      onSaved();
    } catch(e) { console.error(e); setSaving(false); }
  };

  const handleRequest = async () => {
    setSaving(true);
    try {
      // Salva como rascunho com flag de solicitação do cliente
      await addDoc(collection(db, 'users', session.adminUid, 'posts'), {
        title: `[Solicitação] ${requestNote.trim() || format(day, "dd/MM")}`,
        caption: requestNote.trim(),
        status: 'rascunho',
        platforms: ['instagram'],
        scheduledAt: day.toISOString(),
        requestedByClient: true,
        clientName: session.clientName,
        clientEmail: session.clientEmail,
        createdAt: new Date().toISOString(),
      });
      setRequested(true);
      setSaving(false);
    } catch(e) { console.error(e); setSaving(false); }
  };

  const togglePlatform = (p: string) =>
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#FFFFFF', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 16, color: '#0F172A', margin: 0, marginBottom: 2 }}>
              {mode === 'list' ? `Posts em ${format(day, "dd/MM", { locale: ptBR })}` : mode === 'create' ? '+ Novo Post' : '📩 Solicitar Post'}
            </h3>
            <div style={{ fontSize: 12, color: '#64748B', textTransform: 'capitalize' }}>📅 {dateLabel}</div>
          </div>
          <button onClick={onClose} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '18px 22px' }}>
          {/* LIST mode */}
          {mode === 'list' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {existingPosts.map(p => {
                const cfg = STATUS[p.status] ?? STATUS.rascunho;
                return (
                  <div key={p.id} onClick={() => onViewPost(p)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0', cursor: 'pointer', transition: 'all 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; }}>
                    {p.mediaUrl ? (
                      <img src={p.mediaUrl} alt="" style={{ width: 36, height: 36, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                      <div style={{ fontSize: 11, color: cfg.text, marginTop: 1, fontWeight: 600 }}>{cfg.label}</div>
                    </div>
                    <span style={{ color: '#94A3B8', fontSize: 14 }}>›</span>
                  </div>
                );
              })}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {session.canCreate ? (
                  <button onClick={() => setMode('create')} style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13,
                    fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700,
                    background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff',
                  }}>+ Criar novo post</button>
                ) : (
                  <button onClick={() => setMode('request')} style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #E2E8F0', cursor: 'pointer', fontSize: 13,
                    fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700,
                    background: '#F8FAFC', color: '#4F46E5',
                  }}>📩 Solicitar post neste dia</button>
                )}
              </div>
            </div>
          )}

          {/* CREATE mode */}
          {mode === 'create' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {existingPosts.length > 0 && (
                <button onClick={() => setMode('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4F46E5', fontSize: 12, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, padding: 0, textAlign: 'left', marginBottom: -4 }}>
                  ← Ver posts existentes
                </button>
              )}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Título *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Post de engajamento" autoFocus
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 14, color: '#0F172A', background: '#F8FAFC', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Legenda / Descrição</label>
                <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Escreva a legenda do post…" rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 14, color: '#0F172A', background: '#F8FAFC', fontFamily: 'Inter, sans-serif', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 14, color: '#0F172A', background: '#F8FAFC', fontFamily: 'Inter, sans-serif', cursor: 'pointer', outline: 'none', appearance: 'none', boxSizing: 'border-box' }}>
                  {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Plataformas</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ALL_PLATFORMS.map(p => (
                    <button key={p} type="button" onClick={() => togglePlatform(p)} style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
                      fontSize: 12, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600,
                      background: platforms.includes(p) ? 'rgba(79,70,229,0.10)' : '#F8FAFC',
                      color: platforms.includes(p) ? '#4F46E5' : '#64748B',
                      outline: `1px solid ${platforms.includes(p) ? 'rgba(79,70,229,0.30)' : '#E2E8F0'}`,
                    }}>
                      <span>{PLATFORM_ICON[p]}</span>{p.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', cursor: 'pointer', fontSize: 13, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600 }}>Cancelar</button>
                <button onClick={handleCreate} disabled={saving || !title.trim()} style={{
                  padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13,
                  fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700,
                  background: saving || !title.trim() ? '#CBD5E1' : 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff',
                }}>
                  {saving ? '…' : '✅ Criar post'}
                </button>
              </div>
            </div>
          )}

          {/* REQUEST mode */}
          {mode === 'request' && !requested && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {existingPosts.length > 0 && (
                <button onClick={() => setMode('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4F46E5', fontSize: 12, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, padding: 0, textAlign: 'left' }}>
                  ← Ver posts existentes
                </button>
              )}
              <div style={{ background: 'rgba(79,70,229,0.06)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(79,70,229,0.15)' }}>
                <p style={{ fontSize: 13, color: '#4F46E5', margin: 0, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600 }}>
                  📩 Envie uma solicitação de conteúdo para sua agência nesta data.
                </p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>O que você gostaria?</label>
                <textarea value={requestNote} onChange={e => setRequestNote(e.target.value)} placeholder="Descreva o tipo de conteúdo que você quer para esta data…" rows={4}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 14, color: '#0F172A', background: '#F8FAFC', fontFamily: 'Inter, sans-serif', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', cursor: 'pointer', fontSize: 13, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600 }}>Cancelar</button>
                <button onClick={handleRequest} disabled={saving} style={{
                  padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13,
                  fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700,
                  background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff',
                }}>
                  {saving ? '…' : '📨 Enviar solicitação'}
                </button>
              </div>
            </div>
          )}

          {/* REQUEST success */}
          {mode === 'request' && requested && (
            <div style={{ textAlign: 'center', padding: '32px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 17, color: '#0F172A', marginBottom: 8 }}>Solicitação enviada!</h3>
              <p style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>Sua agência foi notificada e criará o conteúdo para {format(day, "dd/MM", { locale: ptBR })}.</p>
              <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700 }}>Fechar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── POST VIEW MODAL — Preview + Info + Comentários + Ações ─── */
function PostModal({ post, session, onClose, onUpdated, onDeleted, onZoom }: {
  post: ColabPost; session: ColabSession;
  onClose: () => void; onUpdated: () => void; onDeleted: () => void; onZoom: (url: string) => void;
}) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [text, setText]         = useState('');
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab]           = useState<'preview' | 'info' | 'comments' | 'actions'>('preview');
  const [editStatus, setEditStatus] = useState(post.status);
  const [editPlatform, setEditPlatform] = useState(post.platforms?.[0] ?? 'instagram');
  const [editDate, setEditDate] = useState<string>(() => { try { return post.scheduledAt ? format(new Date(post.scheduledAt), 'yyyy-MM-dd') : ''; } catch { return ''; } });
  const [editCaption, setEditCaption] = useState(post.caption ?? '');
  const [editCampaign, setEditCampaign] = useState(post.campaignId ?? '');
  const cfg = STATUS[post.status] ?? STATUS.rascunho;

  const mediaUrl = post.mediaUrl ?? post.creatives?.[0]?.url;
  const isVideo  = (post.fileType === 'video') || (post.creatives?.[0]?.type ?? '').includes('video');

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const snap = await getDocs(collection(db, 'users', session.adminUid, 'posts', post.id, 'comments'));
        setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as PostComment)));
      } catch {}
    };
    fetchComments();
  }, [post.id]);

  const submitComment = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const ref = await addDoc(collection(db, 'users', session.adminUid, 'posts', post.id, 'comments'), {
        postId: post.id, adminUid: session.adminUid,
        author: session.clientName, text: text.trim(),
        createdAt: new Date().toISOString(),
      });
      setComments(prev => [...prev, { id: ref.id, postId: post.id, adminUid: session.adminUid, author: session.clientName, text: text.trim(), createdAt: new Date().toISOString() }]);
      setText('');
    } catch {}
    setSaving(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', session.adminUid, 'posts', post.id), {
        status: editStatus,
        platforms: [editPlatform],
        scheduledAt: editDate ? new Date(editDate + 'T12:00:00').toISOString() : (post.scheduledAt ?? null),
        caption: editCaption,
        ...(editCampaign ? { campaignId: editCampaign } : {}),
      });
      onUpdated();
    } catch(e) { console.error(e); setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este post?')) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'users', session.adminUid, 'posts', post.id));
      onDeleted();
    } catch(e) { console.error(e); setDeleting(false); }
  };

  const TABS = [
    { id: 'preview'  as const, label: 'Preview'    },
    { id: 'info'     as const, label: 'Informações' },
    { id: 'comments' as const, label: `Comentários (${comments.length})` },
    { id: 'actions'  as const, label: 'Ações'       },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#FFFFFF', boxShadow: '0 20px 60px rgba(0,0,0,0.22)' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              {/* Thumbnail pequena no header */}
              {mediaUrl && (
                <div style={{ width: 32, height: 32, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                  <img src={mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onClick={() => mediaUrl && onZoom(mediaUrl)} />
                </div>
              )}
              <span style={{ padding: '2px 8px', borderRadius: 999, background: cfg.pill, color: cfg.text, fontSize: 10, fontWeight: 700, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{cfg.label}</span>
              {post.platforms?.map(pl => <span key={pl} style={{ fontSize: 14 }}>{PLATFORM_ICON[pl] ?? '📱'}</span>)}
            </div>
            <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 16, color: '#0F172A', margin: 0 }}>{post.title}</h3>
            {post.scheduledAt && (
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 3, fontWeight: 500 }}>
                📅 {format(new Date(post.scheduledAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <button onClick={() => { setTab('actions'); }} title="Editar" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#4F46E5', padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Plus Jakarta Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
              ✏️ Editar Post
            </button>
            <button onClick={handleDelete} disabled={deleting} title="Deletar" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Plus Jakarta Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
              🗑️ Deletar
            </button>
            <button onClick={onClose} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', padding: '0 20px', background: '#FFFFFF', overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, fontFamily: 'Plus Jakarta Sans, sans-serif', whiteSpace: 'nowrap',
              color: tab === t.id ? '#4F46E5' : '#64748B',
              borderBottom: tab === t.id ? '2px solid #4F46E5' : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: 'auto', background: '#FFFFFF' }}>
          {/* PREVIEW TAB */}
          {tab === 'preview' && (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              {mediaUrl ? (
                <div style={{ width: '100%', maxWidth: 380, borderRadius: 14, overflow: 'hidden', background: '#F1F5F9', border: '1px solid #E2E8F0', aspectRatio: '1/1', cursor: 'zoom-in' }} onClick={() => mediaUrl && onZoom(mediaUrl)}>
                  {isVideo ? (
                    <video src={mediaUrl} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <img src={mediaUrl} alt={post.title} onClick={() => onZoom(mediaUrl)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'zoom-in' }} />
                  )}
                </div>
              ) : (
                <div style={{ width: '100%', maxWidth: 380, borderRadius: 14, background: '#F1F5F9', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180, cursor: 'zoom-in' }} onClick={() => mediaUrl && onZoom(mediaUrl)}>
                  <span style={{ fontSize: 40 }}>🖼️</span>
                </div>
              )}
              {post.caption && (
                <div style={{ width: '100%', maxWidth: 380 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>LEGENDA</div>
                  <p style={{ color: '#334155', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{post.caption}</p>
                </div>
              )}
            </div>
          )}

          {/* INFO TAB */}
          {tab === 'info' && (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {post.caption && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>LEGENDA</div>
                  <p style={{ color: '#334155', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{post.caption}</p>
                </div>
              )}
              {post.hashtags && post.hashtags.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>HASHTAGS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {post.hashtags.map(h => (
                      <span key={h} style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(79,70,229,0.10)', color: '#4F46E5', fontSize: 12, fontWeight: 600, border: '1px solid rgba(79,70,229,0.20)' }}>{h}</span>
                    ))}
                  </div>
                </div>
              )}
              {post.platforms && post.platforms.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>PLATAFORMAS</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {post.platforms.map(pl => (
                      <div key={pl} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: 13, color: '#0F172A', fontWeight: 600, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        <span>{PLATFORM_ICON[pl] ?? '📱'}</span>{pl.replace('_', ' ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* COMMENTS TAB */}
          {tab === 'comments' && (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {comments.length === 0 && (
                <div style={{ textAlign: 'center', color: '#64748B', padding: 24, fontSize: 13 }}>Nenhum comentário ainda. Seja o primeiro!</div>
              )}
              {comments.map(c => (
                <div key={c.id} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#4F46E5', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{c.author}</span>
                    <span style={{ fontSize: 10, color: '#94A3B8' }}>{format(new Date(c.createdAt), "dd/MM HH:mm")}</span>
                  </div>
                  <p style={{ color: '#334155', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{c.text}</p>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Escreva um comentário…" rows={2}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 14, color: '#0F172A', background: '#F8FAFC', fontFamily: 'Inter, sans-serif', resize: 'none', outline: 'none' }}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitComment(); }} />
                <button onClick={submitComment} disabled={saving || !text.trim()} style={{
                  padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff', alignSelf: 'flex-end',
                  fontSize: 16, fontWeight: 700,
                }}>
                  {saving ? '…' : '➤'}
                </button>
              </div>
            </div>
          )}

          {/* ACTIONS TAB */}
          {tab === 'actions' && (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Plataforma</label>
                  <select value={editPlatform} onChange={e => setEditPlatform(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 14, color: '#0F172A', background: '#F8FAFC', appearance: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}>
                    {ALL_PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_ICON[p]} {p.replace('_',' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Data</label>
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 14, color: '#0F172A', background: '#F8FAFC', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Status</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 14, color: '#0F172A', background: '#F8FAFC', appearance: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}>
                  {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Campanha</label>
                <input value={editCampaign} onChange={e => setEditCampaign(e.target.value)} placeholder="ID ou nome da campanha"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 14, color: '#0F172A', background: '#F8FAFC', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Legenda</label>
                <textarea value={editCaption} onChange={e => setEditCaption(e.target.value)} rows={3} placeholder="Legenda do post…"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 14, color: '#0F172A', background: '#F8FAFC', fontFamily: 'Inter, sans-serif', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', cursor: 'pointer', fontSize: 13, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600 }}>Cancelar</button>
                <button onClick={handleSave} disabled={saving} style={{
                  padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13,
                  fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700,
                  background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff',
                }}>
                  {saving ? '…' : '💾 Salvar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
