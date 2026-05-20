'use client';
/**
 * components/colab/ColabCalendar.tsx
 * 
 * Calendário principal do AHA Social Colab.
 * - Visão mensal com navegação
 * - Células clicáveis: abre modal do post ou "criar conteúdo"
 * - Posts com pills coloridos por status
 * - Visão semana / mês (toggle)
 * - Comentários inline
 */

import { useState, useEffect, useMemo } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, startOfWeek as getWeekStart,
  eachWeekOfInterval, addDays,
} from 'date-fns';
import { ptBR }               from 'date-fns/locale';
import { getPostComments, addPostComment } from '@/lib/colab/firestore';
import type { ColabPost, ColabSession, PostComment } from '@/lib/colab/types';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getFirestore }  from 'firebase/firestore';
import { app }           from '@/lib/firebase/config';

const db = getFirestore(app);

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label:string; dot:string; pill:string; text:string }> = {
  rascunho:          { label:'Rascunho',   dot:'#6B7280', pill:'rgba(107,114,128,0.18)', text:'#9CA3AF'  },
  conteudo:          { label:'Conteúdo',   dot:'#60A5FA', pill:'rgba(96,165,250,0.18)',  text:'#93C5FD'  },
  revisao:           { label:'Revisão',    dot:'#FBD44B', pill:'rgba(251,212,75,0.18)',  text:'#FDE68A'  },
  aprovacao_cliente: { label:'Ap. Cliente',dot:'#C084FC', pill:'rgba(192,132,252,0.18)',text:'#D8B4FE'  },
  em_analise:        { label:'Em Análise', dot:'#818CF8', pill:'rgba(129,140,248,0.18)',text:'#A5B4FC'  },
  aprovado:          { label:'Aprovado',   dot:'#34D399', pill:'rgba(52,211,153,0.18)', text:'#6EE7B7'  },
  rejeitado:         { label:'Rejeitado',  dot:'#F87171', pill:'rgba(248,113,113,0.18)',text:'#FCA5A5'  },
  publicado:         { label:'Publicado',  dot:'#38BDF8', pill:'rgba(56,189,248,0.18)', text:'#7DD3FC'  },
};

const PLATFORM_EMOJI: Record<string, string> = {
  instagram:'📸', facebook:'👍', youtube:'▶️', tiktok:'🎵',
  linkedin:'💼', threads:'🧵', pinterest:'📌', google_business:'🏢',
};

const WEEKDAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

// ── PostModal ─────────────────────────────────────────────────────────────────
function PostModal({ post, session, onClose }: { post: ColabPost; session: ColabSession; onClose: () => void }) {
  const [comments, setComments]   = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving]         = useState(false);
  const [tab, setTab]               = useState<'info' | 'comments'>('info');
  const [imgIdx, setImgIdx]         = useState(0);

  const status = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.rascunho;

  useEffect(() => {
    getPostComments(session.adminUid, post.id).then(setComments);
  }, [post.id, session.adminUid]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSaving(true);
    try {
      const comment: Omit<PostComment, 'id'> = {
        postId:      post.id,
        adminUid:    session.adminUid,
        author:      'client',
        authorName:  session.clientName,
        text:        newComment.trim(),
        createdAt:   new Date().toISOString(),
      };
      const id = await addPostComment(comment);
      setComments((prev) => [...prev, { ...comment, id }]);
      setNewComment('');
    } finally { setSaving(false); }
  };

  const slides = post.creatives?.map((c) => c.url).filter(Boolean) ?? [];

  return (
    <div className="colab-modal-overlay" onClick={(e) => { if(e.target === e.currentTarget) onClose(); }}>
      <div className="glass colab-modal colab-fade-up" style={{ borderRadius:24 }}>
        {/* Header */}
        <div style={{
          padding:'18px 20px 14px',
          borderBottom:'1px solid var(--colab-border)',
          display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
            <div style={{
              width:38, height:38, borderRadius:10, flexShrink:0,
              background:'rgba(124,58,237,0.18)',
              border:'1px solid rgba(124,58,237,0.25)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
            }}>
              {PLATFORM_EMOJI[post.platforms?.[0] ?? ''] ?? '📝'}
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {post.title}
              </div>
              <span style={{
                display:'inline-flex', alignItems:'center', gap:4,
                background:status.pill, color:status.text,
                fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:99, marginTop:3,
              }}>
                <span style={{ width:5, height:5, borderRadius:'50%', background:status.dot, flexShrink:0 }}/>
                {status.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--colab-muted)', fontSize:20, lineHeight:1, flexShrink:0 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ padding:'12px 20px 0' }}>
          <div className="colab-tabs" style={{ maxWidth:260 }}>
            {(['info','comments'] as const).map((t) => (
              <button key={t} className={`colab-tab${tab===t?' active':''}`} onClick={() => setTab(t)}>
                {t === 'info' ? '📄 Conteúdo' : `💬 Comentários${comments.length ? ` (${comments.length})` : ''}`}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="colab-scroll" style={{ padding:20, overflowY:'auto', maxHeight:'calc(90vh - 180px)' }}>
          {tab === 'info' && (
            <div>
              {/* Creative preview */}
              {slides.length > 0 && (
                <div style={{ marginBottom:20 }}>
                  <div style={{
                    borderRadius:14, overflow:'hidden', background:'#000',
                    aspectRatio:'4/3', maxHeight:260, position:'relative',
                  }}>
                    <img
                      src={slides[imgIdx]}
                      alt={post.title}
                      style={{ width:'100%', height:'100%', objectFit:'contain' }}
                    />
                    {slides.length > 1 && (
                      <>
                        <button onClick={() => setImgIdx((i) => Math.max(0,i-1))} disabled={imgIdx===0}
                          style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', background:'rgba(0,0,0,0.6)', border:'none', color:'#fff', width:28, height:28, borderRadius:'50%', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
                        <button onClick={() => setImgIdx((i) => Math.min(slides.length-1,i+1))} disabled={imgIdx===slides.length-1}
                          style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'rgba(0,0,0,0.6)', border:'none', color:'#fff', width:28, height:28, borderRadius:'50%', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
                        <div style={{ position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)', display:'flex', gap:4 }}>
                          {slides.map((_,i) => (
                            <button key={i} onClick={() => setImgIdx(i)}
                              style={{ width:6, height:6, borderRadius:'50%', border:'none', cursor:'pointer', background: i===imgIdx ? '#fff' : 'rgba(255,255,255,0.4)' }}/>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Meta grid */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:18 }}>
                {[
                  { label:'Plataforma', value: post.platforms?.map((p) => PLATFORM_EMOJI[p]).join(' ') || '—' },
                  { label:'Data',       value: post.scheduledAt ? format(new Date(post.scheduledAt), 'dd MMM yyyy', { locale:ptBR }) : '—' },
                  { label:'Status',     value: status.label },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    background:'rgba(255,255,255,0.04)',
                    border:'1px solid var(--colab-border)',
                    borderRadius:10, padding:'10px 12px',
                  }}>
                    <div style={{ fontSize:9, color:'var(--colab-subtle)', letterSpacing:'0.10em', textTransform:'uppercase', marginBottom:4 }}>{label}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Caption */}
              {post.caption && (
                <div style={{
                  background:'rgba(255,255,255,0.04)',
                  border:'1px solid var(--colab-border)',
                  borderRadius:12, padding:'14px 16px', marginBottom:14,
                }}>
                  <div style={{ fontSize:10, color:'var(--colab-subtle)', letterSpacing:'0.10em', textTransform:'uppercase', marginBottom:8 }}>LEGENDA</div>
                  <p style={{ fontSize:13, color:'var(--colab-text)', lineHeight:1.7, whiteSpace:'pre-wrap', margin:0 }}>{post.caption}</p>
                </div>
              )}

              {/* Hashtags */}
              {(post.hashtags?.length ?? 0) > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {post.hashtags!.map((h) => (
                    <span key={h} style={{
                      background:'rgba(167,139,250,0.12)',
                      border:'1px solid rgba(167,139,250,0.22)',
                      color:'var(--colab-lilac)',
                      fontSize:11, padding:'3px 10px', borderRadius:99,
                    }}>#{h}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'comments' && (
            <div>
              {comments.length === 0 && (
                <div style={{ textAlign:'center', color:'var(--colab-subtle)', padding:'32px 0', fontSize:13 }}>
                  Nenhum comentário ainda. Seja o primeiro!
                </div>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                {comments.map((c) => (
                  <div key={c.id} style={{
                    display:'flex', gap:10, alignItems:'flex-start',
                    flexDirection: c.author === 'client' ? 'row-reverse' : 'row',
                  }}>
                    <div className="colab-avatar" style={{
                      width:28, height:28, fontSize:11, flexShrink:0,
                      background: c.author === 'client' ? 'var(--grad-btn)' : 'rgba(255,255,255,0.1)',
                    }}>
                      {c.authorName.split(' ').map((w) => w[0]).slice(0,2).join('')}
                    </div>
                    <div style={{
                      maxWidth:'72%',
                      background: c.author === 'client' ? 'rgba(124,58,237,0.20)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${c.author === 'client' ? 'rgba(124,58,237,0.30)' : 'var(--colab-border)'}`,
                      borderRadius:12, padding:'8px 12px',
                    }}>
                      <div style={{ fontSize:10, color:'var(--colab-subtle)', marginBottom:3 }}>
                        {c.authorName} · {format(new Date(c.createdAt), 'dd/MM HH:mm')}
                      </div>
                      <p style={{ fontSize:13, color:'var(--colab-text)', margin:0, lineHeight:1.5 }}>{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Comment input */}
              <div style={{ display:'flex', gap:8 }}>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => { if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleAddComment(); }}}
                  placeholder="Deixe um comentário…"
                  className="colab-input"
                  style={{ resize:'none', height:60, fontSize:13 }}
                />
                <button
                  className="btn-colab"
                  onClick={handleAddComment}
                  disabled={saving || !newComment.trim()}
                  style={{ padding:'0 16px', flexShrink:0, alignSelf:'stretch', fontSize:13 }}
                >
                  {saving ? '…' : '↑'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── EmptyDayModal ─────────────────────────────────────────────────────────────
function EmptyDayModal({ day, onClose }: { day: Date; onClose: () => void }) {
  return (
    <div className="colab-modal-overlay" onClick={(e) => { if(e.target===e.currentTarget) onClose(); }}>
      <div className="glass colab-modal colab-fade-up" style={{ maxWidth:340, borderRadius:20, padding:28, textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:16 }}>📅</div>
        <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:17, color:'#fff', marginBottom:8 }}>
          {format(day, "dd 'de' MMMM", { locale:ptBR })}
        </h3>
        <p style={{ color:'var(--colab-muted)', fontSize:13, lineHeight:1.6, marginBottom:24 }}>
          Nenhum conteúdo agendado para este dia ainda. Sua equipe está trabalhando para preencher o calendário! 🚀
        </p>
        <button className="btn-colab-ghost" onClick={onClose} style={{ width:'100%', justifyContent:'center' }}>Fechar</button>
      </div>
    </div>
  );
}

// ── Main ColabCalendar ────────────────────────────────────────────────────────
interface ColabCalendarProps {
  session: ColabSession;
}

export function ColabCalendar({ session }: ColabCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode,     setViewMode]     = useState<'month' | 'week'>('month');
  const [posts,        setPosts]        = useState<ColabPost[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedPost, setSelectedPost] = useState<ColabPost | null>(null);
  const [selectedDay,  setSelectedDay]  = useState<Date | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Load posts from admin's Firestore
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, `users/${session.adminUid}/posts`),
      orderBy('scheduledAt', 'asc'),
    );
    getDocs(q).then((snap) => {
      const items: ColabPost[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id:          d.id,
          title:       data.title        ?? '—',
          caption:     data.caption,
          hashtags:    data.hashtags,
          status:      data.status       ?? 'rascunho',
          platforms:   data.platforms,
          scheduledAt: data.scheduledAt?.toDate?.()?.toISOString() ?? data.scheduledAt,
          creatives:   data.creatives,
          campaignId:  data.campaignId,
        } as ColabPost;
      });
      setPosts(items);
    }).finally(() => setLoading(false));
  }, [session.adminUid]);

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(currentMonth);
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 0 });
  const days       = eachDayOfInterval({ start: calStart, end: calEnd });

  // Filter
  const filteredPosts = useMemo(() =>
    filterStatus === 'all' ? posts : posts.filter((p) => p.status === filterStatus),
  [posts, filterStatus]);

  const postsOnDay = (day: Date) =>
    filteredPosts.filter((p) => {
      if (!p.scheduledAt) return false;
      return isSameDay(new Date(p.scheduledAt), day);
    });

  const totalThisMonth = filteredPosts.filter((p) => {
    if (!p.scheduledAt) return false;
    return isSameMonth(new Date(p.scheduledAt), currentMonth);
  }).length;

  const handleDayClick = (day: Date) => {
    const dayPosts = postsOnDay(day);
    if (dayPosts.length === 1) { setSelectedPost(dayPosts[0]); return; }
    if (dayPosts.length === 0) { setSelectedDay(day); return; }
    // Multiple posts: show first one (or could open a list — here opens first)
    setSelectedPost(dayPosts[0]);
  };

  return (
    <div style={{ padding:'24px 20px', minHeight:'100%' }}>
      {/* Header */}
      <div className="colab-fade-up" style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <div>
            <h1 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:26, color:'#fff', letterSpacing:'-0.02em', marginBottom:4 }}>
              Colab Calendar ✦
            </h1>
            <p style={{ color:'var(--colab-muted)', fontSize:13 }}>
              Acompanhe cada conteúdo em tempo real · {totalThisMonth} posts este mês
            </p>
          </div>

          {/* View toggle */}
          <div className="colab-tabs" style={{ minWidth:180 }}>
            <button className={`colab-tab${viewMode==='month'?' active':''}`} onClick={() => setViewMode('month')}>Mês</button>
            <button className={`colab-tab${viewMode==='week'?' active':''}`}  onClick={() => setViewMode('week')}>Semana</button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display:'flex', gap:12, marginTop:20, flexWrap:'wrap' }}>
          {[
            { label:'Total',    value: posts.length,                                  color:'var(--colab-lilac)' },
            { label:'Publicados', value: posts.filter(p=>p.status==='publicado').length, color:'#34D399' },
            { label:'Aprovados',  value: posts.filter(p=>p.status==='aprovado').length,  color:'#60A5FA' },
            { label:'Em revisão', value: posts.filter(p=>p.status==='revisao').length,   color:'#FBD44B' },
          ].map((s) => (
            <div key={s.label} className="glass" style={{ borderRadius:12, padding:'10px 16px', display:'flex', flexDirection:'column', gap:2, minWidth:88 }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:20, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:10, color:'var(--colab-subtle)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter pills */}
        <div style={{ display:'flex', gap:6, marginTop:16, flexWrap:'wrap' }}>
          <button
            onClick={() => setFilterStatus('all')}
            style={{
              padding:'4px 12px', borderRadius:99, fontSize:11, fontWeight:600, cursor:'pointer', border:'none',
              background: filterStatus==='all' ? 'var(--grad-btn)' : 'rgba(255,255,255,0.06)',
              color: filterStatus==='all' ? '#fff' : 'var(--colab-muted)',
              transition:'all 0.15s',
            }}
          >Todos</button>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              style={{
                padding:'4px 12px', borderRadius:99, fontSize:11, fontWeight:600, cursor:'pointer', border:'none',
                background: filterStatus===key ? cfg.pill : 'rgba(255,255,255,0.04)',
                color: filterStatus===key ? cfg.text : 'var(--colab-muted)',
                transition:'all 0.15s',
                display:'flex', alignItems:'center', gap:4,
              }}
            >
              <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.dot }}/>
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Month navigation */}
      <div className="glass colab-fade-up colab-fade-up-d1" style={{ borderRadius:20, overflow:'hidden' }}>
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'16px 20px', borderBottom:'1px solid var(--colab-border)',
        }}>
          <button onClick={() => setCurrentMonth((d) => subMonths(d,1))}
            style={{ width:34, height:34, borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid var(--colab-border)', color:'var(--colab-muted)', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>
            ‹
          </button>
          <div style={{ textAlign:'center' }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:17, color:'#fff', margin:0, textTransform:'capitalize' }}>
              {format(currentMonth, 'MMMM yyyy', { locale:ptBR })}
            </h3>
          </div>
          <button onClick={() => setCurrentMonth((d) => addMonths(d,1))}
            style={{ width:34, height:34, borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid var(--colab-border)', color:'var(--colab-muted)', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>
            ›
          </button>
        </div>

        {/* Weekday headers */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid var(--colab-border)' }}>
          {WEEKDAYS_SHORT.map((d) => (
            <div key={d} style={{
              textAlign:'center', padding:'10px 4px',
              fontSize:11, fontWeight:700, color:'var(--colab-subtle)',
              letterSpacing:'0.08em', textTransform:'uppercase',
            }}>{d}</div>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ padding:48, textAlign:'center', color:'var(--colab-muted)' }}>
            <div style={{ width:32, height:32, border:'3px solid rgba(124,58,237,0.2)', borderTopColor:'var(--colab-violet)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            Carregando posts…
          </div>
        )}

        {/* Calendar grid */}
        {!loading && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
            {days.map((day) => {
              const dayPosts   = postsOnDay(day);
              const inMonth    = isSameMonth(day, currentMonth);
              const isTodayDay = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className="cal-cell"
                  onClick={() => handleDayClick(day)}
                  style={{ opacity: inMonth ? 1 : 0.3 }}
                >
                  <div className={`cal-day-num${isTodayDay ? ' today-num' : ''}`} style={{
                    width:24, height:24, borderRadius:'50%', fontSize:12, fontWeight:600,
                    display:'flex', alignItems:'center', justifyContent:'center', marginBottom:4,
                    background: isTodayDay ? 'var(--grad-btn)' : 'transparent',
                    color: isTodayDay ? '#fff' : 'var(--colab-muted)',
                    boxShadow: isTodayDay ? '0 2px 8px rgba(124,58,237,0.5)' : 'none',
                  }}>
                    {format(day, 'd')}
                  </div>

                  {dayPosts.slice(0, 3).map((post) => {
                    const cfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.rascunho;
                    return (
                      <div
                        key={post.id}
                        className="cal-post-pill"
                        onClick={(e) => { e.stopPropagation(); setSelectedPost(post); }}
                        style={{
                          background: cfg.pill,
                          color: cfg.text,
                          border: `1px solid ${cfg.pill}`,
                        }}
                      >
                        <span style={{ width:4, height:4, borderRadius:'50%', background:cfg.dot, flexShrink:0 }}/>
                        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
                          {post.title}
                        </span>
                      </div>
                    );
                  })}
                  {dayPosts.length > 3 && (
                    <div style={{ fontSize:9, color:'var(--colab-subtle)', textAlign:'center', paddingTop:2 }}>
                      +{dayPosts.length - 3}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="colab-fade-up colab-fade-up-d2" style={{ display:'flex', flexWrap:'wrap', gap:10, marginTop:16 }}>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:cfg.dot, display:'inline-block' }}/>
            <span style={{ fontSize:10, color:'var(--colab-subtle)' }}>{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Modals */}
      {selectedPost && (
        <PostModal post={selectedPost} session={session} onClose={() => setSelectedPost(null)} />
      )}
      {selectedDay && !selectedPost && (
        <EmptyDayModal day={selectedDay} onClose={() => setSelectedDay(null)} />
      )}
    </div>
  );
}
