'use client';
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ColabSession } from '@/lib/colab/types';

interface ColabPost {
  id: string; adminUid: string; title: string; caption?: string;
  hashtags?: string[]; status: string; platforms?: string[];
  scheduledAt?: string;
  creatives?: { url: string; type?: string; name?: string }[];
  mediaUrl?: string; fileUrl?: string; fileType?: string; campaignId?: string;
}
interface PostComment { id: string; postId: string; adminUid: string; author: string; text: string; createdAt: string; }

const STATUS: Record<string, { label: string; dot: string; pill: string; text: string }> = {
  rascunho:          { label: 'Rascunho',    dot: '#94A3B8', pill: '#F1F5F9', text: '#64748B' },
  conteudo:          { label: 'Conteúdo',    dot: '#3B82F6', pill: '#EFF6FF', text: '#1D4ED8' },
  revisao:           { label: 'Revisão',     dot: '#F59E0B', pill: '#FFFBEB', text: '#B45309' },
  aprovacao_cliente: { label: 'Ap. Cliente', dot: '#8B5CF6', pill: '#F5F3FF', text: '#6D28D9' },
  em_analise:        { label: 'Em Análise',  dot: '#6366F1', pill: '#EEF2FF', text: '#4338CA' },
  aprovado:          { label: 'Aprovado',    dot: '#10B981', pill: '#ECFDF5', text: '#065F46' },
  rejeitado:         { label: 'Rejeitado',   dot: '#EF4444', pill: '#FEF2F2', text: '#991B1B' },
  publicado:         { label: 'Publicado',   dot: '#059669', pill: '#D1FAE5', text: '#065F46' },
};
const STATUS_OPTIONS = Object.entries(STATUS).map(([id, v]) => ({ id, label: v.label }));
const PLATFORM_ICON: Record<string, string> = { instagram: '📸', facebook: '👤', tiktok: '🎵', youtube: '▶️', linkedin: '💼', twitter: '🐦', pinterest: '📌' };
const ALL_PLATFORMS = ['instagram','facebook','tiktok','youtube','linkedin','twitter','pinterest'];

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C', facebook: '#1877F2', tiktok: '#000000',
  youtube: '#FF0000', linkedin: '#0A66C2', twitter: '#1DA1F2', pinterest: '#E60023',
};

export default function ColabCalendar({ session }: { session: ColabSession }) {
  const [posts, setPosts]               = useState<ColabPost[]>([]);
  const [loading, setLoading]           = useState(true);
  const [month, setMonth]               = useState(new Date());
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected]         = useState<ColabPost | null>(null);
  const [newDay, setNewDay]             = useState<Date | null>(null);
  const [view, setView]                 = useState<'month'|'list'>('month');
  const [zoomedImg, setZoomedImg]       = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!session?.adminUid) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users', session.adminUid, 'posts'));
      setPosts(snap.docs.map(d => {
        const r = d.data();
        return {
          id: d.id, adminUid: session.adminUid,
          title: r.title ?? '', caption: r.caption, hashtags: r.hashtags,
          status: r.status ?? 'rascunho', platforms: r.platforms,
          scheduledAt: r.scheduledAt?.toDate?.().toISOString?.() ?? r.scheduledAt,
          creatives: r.creatives,
          mediaUrl: r.creatives?.[0]?.url ?? r.mediaUrl ?? r.fileUrl,
          fileType: (r.creatives?.[0]?.type ?? '').includes('video') ? 'video' : 'image',
          campaignId: r.campaignId,
        } as ColabPost;
      }));
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [session?.adminUid]);

  useEffect(() => { reload(); }, [reload]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
  });

  const postsByDay = days.reduce((acc, day) => {
    const key = format(day, 'yyyy-MM-dd');
    acc[key] = posts.filter(p => { try { return p.scheduledAt && isSameDay(new Date(p.scheduledAt), day); } catch { return false; } });
    return acc;
  }, {} as Record<string, ColabPost[]>);

  const filtered = posts.filter(p => filterStatus === 'all' || p.status === filterStatus);

  return (
    <div style={{ padding: '24px 28px', background: 'linear-gradient(135deg, #EDE9FE 0%, #EEF2FF 50%, #F0F9FF 100%)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 21, color: '#3B0764', letterSpacing: '-0.02em', marginBottom: 2 }}>
            Calendário de Conteúdo
          </h2>
          <p style={{ fontSize: 13, color: '#7C3AED', fontWeight: 500, margin: 0 }}>
            {format(month, 'MMMM yyyy', { locale: ptBR })} · {posts.length} posts agendados
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, padding: '4px 6px', background: 'rgba(255,255,255,0.6)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)' }}>
            {['all','conteudo','revisao','aprovado','publicado','rascunho'].map(s => {
              const active = filterStatus === s;
              const cfg = STATUS[s];
              return (
                <button key={s} onClick={() => setFilterStatus(s)} style={{
                  padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 700, fontFamily: 'Plus Jakarta Sans, sans-serif',
                  background: active ? (s === 'all' ? 'linear-gradient(135deg,#7C3AED,#4F46E5)' : cfg.pill) : 'transparent',
                  color: active ? (s === 'all' ? '#fff' : cfg.text) : '#94A3B8', transition: 'all 0.15s',
                }}>
                  {s === 'all' ? `Todos (${posts.length})` : cfg.label}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(255,255,255,0.6)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)' }}>
            {(['month','list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 700, fontFamily: 'Plus Jakarta Sans, sans-serif',
                background: view === v ? 'linear-gradient(135deg,#7C3AED,#4F46E5)' : 'transparent',
                color: view === v ? '#fff' : '#7C3AED', transition: 'all 0.15s',
              }}>
                {v === 'month' ? '📅 Mês' : '☰ Lista'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === 'month' ? (
        <div style={{ background: 'rgba(255,255,255,0.70)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.8)', overflow: 'hidden', backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(109,40,217,0.12)' }}>
          {/* Nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid rgba(139,92,246,0.15)', background: 'linear-gradient(135deg,rgba(139,92,246,0.12),rgba(99,102,241,0.08))' }}>
            <button onClick={() => setMonth(m => subMonths(m,1))} style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)', cursor: 'pointer', color: '#7C3AED', fontSize: 16, padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>‹</button>
            <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 15, color: '#3B0764', textTransform: 'capitalize', margin: 0 }}>
              {format(month, 'MMMM yyyy', { locale: ptBR })}
            </h3>
            <button onClick={() => setMonth(m => addMonths(m,1))} style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)', cursor: 'pointer', color: '#7C3AED', fontSize: 16, padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>›</button>
          </div>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid rgba(139,92,246,0.12)', background: 'rgba(245,243,255,0.60)' }}>
            {['DOM','SEG','TER','QUA','QUI','SEX','SÁB'].map(d => (
              <div key={d} style={{ padding: '8px 6px', textAlign: 'center', fontSize: 10, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, color: '#7C3AED', letterSpacing: '0.08em' }}>{d}</div>
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
                <div key={key} onClick={() => inMonth && setNewDay(day)}
                  style={{
                    padding: '8px 6px 6px', aspectRatio: '1/1',
                    borderBottom: idx < days.length - 7 ? '1px solid rgba(139,92,246,0.10)' : 'none',
                    borderRight: (idx+1) % 7 !== 0 ? '1px solid rgba(139,92,246,0.10)' : 'none',
                    outline: isT ? '2px solid #7C3AED' : 'none', outlineOffset: '-2px',
                    boxShadow: isT ? 'inset 0 0 12px rgba(124,58,237,0.10)' : 'none',
                    background: isT ? 'rgba(124,58,237,0.12)' : dayPosts.length > 0 ? 'linear-gradient(135deg,rgba(139,92,246,0.10),rgba(99,102,241,0.06))' : 'rgba(255,255,255,0.50)',
                    opacity: inMonth ? 1 : 0.3, cursor: inMonth ? 'pointer' : 'default', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => inMonth && (e.currentTarget.style.background = 'rgba(139,92,246,0.12)')}
                  onMouseLeave={e => (e.currentTarget.style.background = isT ? 'rgba(124,58,237,0.12)' : dayPosts.length > 0 ? 'linear-gradient(135deg,rgba(139,92,246,0.10),rgba(99,102,241,0.06))' : 'rgba(255,255,255,0.50)')}
                >
                  <div style={{ fontSize: 12, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, color: isT ? '#7C3AED' : inMonth ? '#3B0764' : '#CBD5E1', marginBottom: 4, textAlign: 'right' }}>
                    {isT ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', color: '#fff', fontSize: 11, boxShadow: '0 2px 8px rgba(124,58,237,0.4)' }}>
                        {format(day,'d')}
                      </span>
                    ) : format(day,'d')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayPosts.slice(0,2).map(p => {
                      const cfg = STATUS[p.status] ?? STATUS.rascunho;
                      const platColor = PLATFORM_COLORS[p.platforms?.[0] ?? ''] ?? cfg.dot;
                      return (
                        <div key={p.id} onClick={e => { e.stopPropagation(); setSelected(p); }}
                          style={{ borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: `1px solid rgba(139,92,246,0.20)`, boxShadow: '0 1px 4px rgba(109,40,217,0.08)', background: 'rgba(255,255,255,0.85)' }}>
                          <div style={{ height: 3, background: platColor, width: '100%' }} />
                          {p.mediaUrl ? (
                            <img src={p.mediaUrl} alt="" style={{ width: '100%', height: 52, objectFit: 'cover', display: 'block' }} />
                          ) : (
                            <div style={{ padding: '3px 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: platColor, flexShrink: 0 }} />
                              <span style={{ fontSize: 10, fontWeight: 600, color: '#3B0764', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{p.title}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {dayPosts.length > 2 && (
                      <div style={{ fontSize: 9, color: '#7C3AED', fontWeight: 700, textAlign: 'center', background: 'rgba(139,92,246,0.10)', borderRadius: 4, padding: '1px 4px' }}>+{dayPosts.length - 2}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 && !loading && (
            <div style={{ textAlign: 'center', color: '#7C3AED', padding: 48, fontSize: 14 }}>Nenhum post encontrado.</div>
          )}
          {filtered.slice().sort((a,b) => (a.scheduledAt??'').localeCompare(b.scheduledAt??'')).map(p => {
            const cfg = STATUS[p.status] ?? STATUS.rascunho;
            return (
              <div key={p.id} onClick={() => setSelected(p)} style={{
                borderRadius: 14, padding: '13px 18px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.8)',
                backdropFilter: 'blur(8px)', boxShadow: '0 2px 12px rgba(109,40,217,0.08)', transition: 'box-shadow 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(109,40,217,0.15)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(109,40,217,0.08)'}
              >
                <div style={{ width: 44, height: 44, borderRadius: 9, overflow: 'hidden', flexShrink: 0, background: cfg.pill, border: `1px solid ${cfg.dot}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.mediaUrl ? <img src={p.mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, color: '#3B0764', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                  {p.scheduledAt && <div style={{ fontSize: 11, color: '#7C3AED', marginTop: 1, fontWeight: 600 }}>📅 {format(new Date(p.scheduledAt), "dd 'de' MMM", { locale: ptBR })}</div>}
                </div>
                <span style={{ padding: '3px 10px', borderRadius: 999, background: cfg.pill, color: cfg.text, fontSize: 11, fontWeight: 700, border: `1px solid ${cfg.dot}30` }}>{cfg.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {newDay && (
        <DayModal day={newDay} existingPosts={postsByDay[format(newDay,'yyyy-MM-dd')] ?? []} session={session}
          onClose={() => setNewDay(null)} onSaved={() => { setNewDay(null); reload(); }}
          onViewPost={p => { setNewDay(null); setSelected(p); }} />
      )}

      {selected && (
        <PostModal post={selected} session={session}
          onClose={() => setSelected(null)}
          onUpdated={() => { setSelected(null); reload(); }}
          onDeleted={() => { setSelected(null); reload(); }}
          onZoom={setZoomedImg} />
      )}

      {zoomedImg && (
        <div onClick={() => setZoomedImg(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,0,40,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'zoom-out' }}>
          <img src={zoomedImg} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 16, objectFit: 'contain', boxShadow: '0 8px 40px rgba(124,58,237,0.4)' }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setZoomedImg(null)} style={{ position: 'absolute', top: 20, right: 24, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '50%', width: 36, height: 36, color: '#fff', fontSize: 20, cursor: 'pointer' }}><Icon name="Close_MD" size={14} /></button>
        </div>
      )}
    </div>
  );
}

function DayModal({ day, existingPosts, session, onClose, onSaved, onViewPost }: {
  day: Date; existingPosts: ColabPost[]; session: ColabSession;
  onClose: () => void; onSaved: () => void; onViewPost: (p: ColabPost) => void;
}) {
  const [mode, setMode]           = useState<'list'|'create'|'request'>(existingPosts.length === 0 ? (session.canCreate ? 'create' : 'request') : 'list');
  const [title, setTitle]         = useState('');
  const [caption, setCaption]     = useState('');
  const [status, setStatus]       = useState('conteudo');
  const [platforms, setPlatforms] = useState(['instagram']);
  const [saving, setSaving]       = useState(false);
  const [requested, setRequested] = useState(false);
  const [requestNote, setRequestNote] = useState('');
  const dateLabel = format(day, "EEEE, dd 'de' MMMM", { locale: ptBR });
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(139,92,246,0.25)', fontSize: 14, color: '#3B0764', background: 'rgba(245,243,255,0.6)', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', outline: 'none' };

  const handleCreate = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'users', session.adminUid, 'posts'), {
        title: title.trim(), caption: caption.trim(), status, platforms,
        scheduledAt: day.toISOString(), hashtags: [], createdByClient: true,
        clientName: session.clientName, createdAt: new Date().toISOString(),
      });
      onSaved();
    } catch(e) { console.error(e); setSaving(false); }
  };

  const handleRequest = async () => {
    setSaving(true);
    try {
      await addDoc(collection(db, 'users', session.adminUid, 'posts'), {
        title: `[Solicitação] ${requestNote.trim() || format(day, "dd/MM")}`,
        caption: requestNote.trim(), status: 'rascunho', platforms: ['instagram'],
        scheduledAt: day.toISOString(), requestedByClient: true,
        clientName: session.clientName, clientEmail: session.clientEmail,
        createdAt: new Date().toISOString(),
      });
      setRequested(true); setSaving(false);
    } catch(e) { console.error(e); setSaving(false); }
  };

  const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(59,7,100,0.55)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 };
  const modalStyle: React.CSSProperties  = { borderRadius: 24, width: '100%', maxWidth: 480, maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', boxShadow: '0 20px 60px rgba(109,40,217,0.25)' };

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid rgba(139,92,246,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'linear-gradient(135deg,rgba(139,92,246,0.10),rgba(99,102,241,0.06))' }}>
          <div>
            <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 16, color: '#3B0764', margin: 0, marginBottom: 2 }}>
              {mode === 'list' ? `Posts em ${format(day,"dd/MM",{locale:ptBR})}` : mode === 'create' ? '+ Novo Post' : '📩 Solicitar Post'}
            </h3>
            <div style={{ fontSize: 12, color: '#7C3AED', fontWeight: 500 }}>📅 {dateLabel}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)', color: '#7C3AED', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="Close_MD" size={14} /></button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '18px 22px' }}>
          {mode === 'list' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {existingPosts.map(p => {
                const cfg = STATUS[p.status] ?? STATUS.rascunho;
                return (
                  <div key={p.id} onClick={() => onViewPost(p)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12, background: 'rgba(245,243,255,0.8)', border: '1px solid rgba(139,92,246,0.20)', cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,243,255,0.8)'; }}>
                    {p.mediaUrl ? <img src={p.mediaUrl} alt="" style={{ width: 36, height: 36, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} /> : <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, color: '#3B0764', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                      <div style={{ fontSize: 11, color: cfg.text, marginTop: 1, fontWeight: 600 }}>{cfg.label}</div>
                    </div>
                    <span style={{ color: '#7C3AED', fontSize: 14 }}>›</span>
                  </div>
                );
              })}
              <div style={{ marginTop: 8 }}>
                {session.canCreate ? (
                  <button onClick={() => setMode('create')} style={{ width: '100%', padding: '10px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', color: '#fff' }}>+ Criar novo post</button>
                ) : (
                  <button onClick={() => setMode('request')} style={{ width: '100%', padding: '10px 0', borderRadius: 12, border: '1px solid rgba(139,92,246,0.30)', cursor: 'pointer', fontSize: 13, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, background: 'rgba(245,243,255,0.8)', color: '#7C3AED' }}>📩 Solicitar post neste dia</button>
                )}
              </div>
            </div>
          )}
          {mode === 'create' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {existingPosts.length > 0 && <button onClick={() => setMode('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7C3AED', fontSize: 12, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, padding: 0, textAlign: 'left' }}>← Ver posts existentes</button>}
              <div><label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#7C3AED', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Título *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Post de engajamento" autoFocus style={inputStyle} /></div>
              <div><label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#7C3AED', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Legenda</label>
                <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Escreva a legenda…" rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></div>
              <div><label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#7C3AED', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
                  {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select></div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid rgba(139,92,246,0.25)', background: 'rgba(245,243,255,0.8)', color: '#7C3AED', cursor: 'pointer', fontSize: 13, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600 }}>Cancelar</button>
                <button onClick={handleCreate} disabled={saving || !title.trim()} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, background: saving || !title.trim() ? '#CBD5E1' : 'linear-gradient(135deg,#7C3AED,#4F46E5)', color: '#fff' }}>
                  {saving ? '…' : '✅ Criar post'}
                </button>
              </div>
            </div>
          )}
          {mode === 'request' && !requested && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'rgba(139,92,246,0.08)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(139,92,246,0.20)' }}>
                <p style={{ fontSize: 13, color: '#7C3AED', margin: 0, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600 }}>📩 Envie uma solicitação de conteúdo para sua agência nesta data.</p>
              </div>
              <div><label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#7C3AED', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>O que você gostaria?</label>
                <textarea value={requestNote} onChange={e => setRequestNote(e.target.value)} placeholder="Descreva o tipo de conteúdo…" rows={4} style={{ ...inputStyle, resize: 'vertical' }} /></div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid rgba(139,92,246,0.25)', background: 'rgba(245,243,255,0.8)', color: '#7C3AED', cursor: 'pointer', fontSize: 13, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600 }}>Cancelar</button>
                <button onClick={handleRequest} disabled={saving} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', color: '#fff' }}>
                  {saving ? '…' : '📨 Enviar solicitação'}
                </button>
              </div>
            </div>
          )}
          {mode === 'request' && requested && (
            <div style={{ textAlign: 'center', padding: '32px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 17, color: '#3B0764', marginBottom: 8 }}>Solicitação enviada!</h3>
              <p style={{ color: '#7C3AED', fontSize: 13, marginBottom: 20 }}>Sua agência foi notificada para {format(day,"dd/MM",{locale:ptBR})}.</p>
              <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', color: '#fff', cursor: 'pointer', fontSize: 14, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700 }}>Fechar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PostModal({ post, session, onClose, onUpdated, onDeleted, onZoom }: {
  post: ColabPost; session: ColabSession;
  onClose: () => void; onUpdated: () => void; onDeleted: () => void; onZoom: (url: string) => void;
}) {
  const [comments, setComments]         = useState<PostComment[]>([]);
  const [text, setText]                 = useState('');
  const [saving, setSaving]             = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [tab, setTab]                   = useState<'preview'|'info'|'comments'|'actions'>('preview');
  const [editStatus, setEditStatus]     = useState(post.status);
  const [editPlatform, setEditPlatform] = useState(post.platforms?.[0] ?? 'instagram');
  const [editDate, setEditDate]         = useState<string>(() => { try { return post.scheduledAt ? format(new Date(post.scheduledAt),'yyyy-MM-dd') : ''; } catch { return ''; } });
  const [editCaption, setEditCaption]   = useState(post.caption ?? '');
  const [editCampaign, setEditCampaign] = useState(post.campaignId ?? '');
  const cfg      = STATUS[post.status] ?? STATUS.rascunho;
  const mediaUrl = post.mediaUrl ?? post.creatives?.[0]?.url;
  const isVideo  = (post.fileType === 'video') || (post.creatives?.[0]?.type ?? '').includes('video');
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(139,92,246,0.25)', fontSize: 14, color: '#3B0764', background: 'rgba(245,243,255,0.6)', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' };

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'users', session.adminUid, 'posts', post.id, 'comments'));
        setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as PostComment)));
      } catch {}
    })();
  }, [post.id]);

  const submitComment = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const ref = await addDoc(collection(db, 'users', session.adminUid, 'posts', post.id, 'comments'), {
        postId: post.id, adminUid: session.adminUid, author: session.clientName,
        text: text.trim(), createdAt: new Date().toISOString(),
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
        status: editStatus, platforms: [editPlatform],
        scheduledAt: editDate ? new Date(editDate+'T12:00:00').toISOString() : (post.scheduledAt ?? null),
        caption: editCaption, ...(editCampaign ? { campaignId: editCampaign } : {}),
      });
      onUpdated();
    } catch(e) { console.error(e); setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este post?')) return;
    setDeleting(true);
    try { await deleteDoc(doc(db, 'users', session.adminUid, 'posts', post.id)); onDeleted(); }
    catch(e) { console.error(e); setDeleting(false); }
  };

  const TABS = [
    { id: 'preview'  as const, label: 'Preview' },
    { id: 'info'     as const, label: 'Informações' },
    { id: 'comments' as const, label: `Comentários (${comments.length})` },
    { id: 'actions'  as const, label: 'Ações' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(59,7,100,0.55)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ borderRadius: 24, width: '100%', maxWidth: 560, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', boxShadow: '0 20px 60px rgba(109,40,217,0.25)' }}>
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(139,92,246,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'linear-gradient(135deg,rgba(139,92,246,0.10),rgba(99,102,241,0.06))' }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              {mediaUrl && <div style={{ width: 32, height: 32, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}><img src={mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} onClick={() => onZoom(mediaUrl)} /></div>}
              <span style={{ padding: '2px 8px', borderRadius: 999, background: cfg.pill, color: cfg.text, fontSize: 10, fontWeight: 700, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{cfg.label}</span>
              {post.platforms?.map(pl => <span key={pl} style={{ fontSize: 14 }}>{PLATFORM_ICON[pl] ?? '📱'}</span>)}
            </div>
            <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 16, color: '#3B0764', margin: 0 }}>{post.title}</h3>
            {post.scheduledAt && <div style={{ fontSize: 11, color: '#7C3AED', marginTop: 3, fontWeight: 500 }}>📅 {format(new Date(post.scheduledAt),"dd 'de' MMMM 'de' yyyy",{locale:ptBR})}</div>}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <button onClick={() => setTab('actions')} style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: '#7C3AED', padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Icon name="Note_Edit" size={13} style={{marginRight:4}} />Editar</button>
            <button onClick={handleDelete} disabled={deleting} style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>🗑️</button>
            <button onClick={onClose} style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: '#7C3AED', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="Close_MD" size={14} /></button>
          </div>
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(139,92,246,0.15)', padding: '0 20px', background: 'rgba(245,243,255,0.40)', overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Plus Jakarta Sans, sans-serif', whiteSpace: 'nowrap', color: tab === t.id ? '#7C3AED' : '#94A3B8', borderBottom: tab === t.id ? '2px solid #7C3AED' : '2px solid transparent', marginBottom: -1, transition: 'all 0.15s' }}>{t.label}</button>
          ))}
        </div>
        <div style={{ flex: 1, overflow: 'auto', background: 'rgba(255,255,255,0.80)' }}>
          {tab === 'preview' && (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              {mediaUrl ? (
                <div onClick={() => onZoom(mediaUrl)} style={{ width: '100%', maxWidth: 380, borderRadius: 16, overflow: 'hidden', background: 'rgba(245,243,255,0.8)', border: '1px solid rgba(139,92,246,0.20)', aspectRatio: '1/1', cursor: 'zoom-in', boxShadow: '0 4px 20px rgba(109,40,217,0.12)' }}>
                  {isVideo ? <video src={mediaUrl} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <img src={mediaUrl} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                </div>
              ) : (
                <div style={{ width: '100%', maxWidth: 380, borderRadius: 16, background: 'rgba(245,243,255,0.8)', border: '1px solid rgba(139,92,246,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
                  <span style={{ fontSize: 40 }}>🖼️</span>
                </div>
              )}
              {post.caption && <div style={{ width: '100%', maxWidth: 380 }}><div style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>LEGENDA</div><p style={{ color: '#3B0764', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{post.caption}</p></div>}
            </div>
          )}
          {tab === 'info' && (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {post.caption && <div><div style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>LEGENDA</div><p style={{ color: '#3B0764', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{post.caption}</p></div>}
              {post.platforms && post.platforms.length > 0 && (
                <div><div style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>PLATAFORMAS</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {post.platforms.map(pl => <div key={pl} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, background: 'rgba(245,243,255,0.8)', border: '1px solid rgba(139,92,246,0.20)', fontSize: 13, color: '#3B0764', fontWeight: 600, fontFamily: 'Plus Jakarta Sans, sans-serif' }}><span>{PLATFORM_ICON[pl]??'📱'}</span>{pl.replace('_',' ')}</div>)}
                  </div>
                </div>
              )}
            </div>
          )}
          {tab === 'comments' && (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {comments.length === 0 && <div style={{ textAlign: 'center', color: '#7C3AED', padding: 24, fontSize: 13 }}>Nenhum comentário ainda. Seja o primeiro!</div>}
              {comments.map(c => (
                <div key={c.id} style={{ background: 'rgba(245,243,255,0.8)', border: '1px solid rgba(139,92,246,0.20)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#7C3AED', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{c.author}</span>
                    <span style={{ fontSize: 10, color: '#94A3B8' }}>{format(new Date(c.createdAt),"dd/MM HH:mm")}</span>
                  </div>
                  <p style={{ color: '#3B0764', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{c.text}</p>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Escreva um comentário…" rows={2}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(139,92,246,0.25)', fontSize: 14, color: '#3B0764', background: 'rgba(245,243,255,0.6)', fontFamily: 'Inter, sans-serif', resize: 'none', outline: 'none' }}
                  onKeyDown={e => { if (e.key==='Enter' && (e.ctrlKey||e.metaKey)) submitComment(); }} />
                <button onClick={submitComment} disabled={saving||!text.trim()} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', color: '#fff', alignSelf: 'flex-end', fontSize: 16, fontWeight: 700 }}>{saving?'…':'➤'}</button>
              </div>
            </div>
          )}
          {tab === 'actions' && (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#7C3AED', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Plataforma</label>
                  <select value={editPlatform} onChange={e => setEditPlatform(e.target.value)} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
                    {ALL_PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_ICON[p]} {p.replace('_',' ')}</option>)}
                  </select></div>
                <div><label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#7C3AED', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Data</label>
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={inputStyle} /></div>
              </div>
              <div><label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#7C3AED', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Status</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
                  {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select></div>
              <div><label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#7C3AED', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Legenda</label>
                <textarea value={editCaption} onChange={e => setEditCaption(e.target.value)} rows={3} placeholder="Legenda do post…" style={{ ...inputStyle, resize: 'vertical' }} /></div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid rgba(139,92,246,0.25)', background: 'rgba(245,243,255,0.8)', color: '#7C3AED', cursor: 'pointer', fontSize: 13, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600 }}>Cancelar</button>
                <button onClick={handleSave} disabled={saving} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', color: '#fff' }}>{saving?'…':'💾 Salvar'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
