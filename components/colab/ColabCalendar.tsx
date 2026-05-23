'use client';
import { useState } from 'react';
import { ColabPost } from '@/lib/colab/types';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const TYPE_COLOR: Record<string, string> = {
  reels: '#7c6fff', carrossel: '#4f8fff', story: '#b39dff',
  feed: '#6fcfff', tiktok: '#ff6fb0', youtube: '#ff6f6f',
};

const STATUS_LABEL: Record<string, string> = {
  planejado: 'Planejado', em_producao: 'Em produção',
  aprovado: 'Aprovado', publicado: 'Publicado',
};
const STATUS_COLOR: Record<string, string> = {
  planejado: '#9b93c8', em_producao: '#f0c060',
  aprovado: '#6fcfff', publicado: '#6fff9b',
};

interface Props {
  posts: ColabPost[];
  onDayClick: (date: string) => void;
}

function MediaThumb({ post }: { post: ColabPost }) {
  if (!post.mediaUrl) {
    return (
      <div style={{
        width: '100%', aspectRatio: '1/1', borderRadius: 6,
        background: (TYPE_COLOR[post.contentType] ?? '#7c6fff') + '22',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, marginBottom: 6,
      }}>
        {post.contentType === 'reels' ? '🎬' :
         post.contentType === 'story' ? '📱' :
         post.contentType === 'tiktok' ? '🎵' :
         post.contentType === 'youtube' ? '▶️' : '🖼️'}
      </div>
    );
  }
  if (post.mediaType === 'video') {
    return (
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: 6, overflow: 'hidden', marginBottom: 6 }}>
        <video src={post.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline preload="metadata" />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
          <span style={{ fontSize: 18 }}>▶</span>
        </div>
      </div>
    );
  }
  return (
    <img src={post.mediaUrl} alt={post.title} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 6, marginBottom: 6, display: 'block' }} />
  );
}

function DayModal({ date, posts, onClose }: { date: string; posts: ColabPost[]; onClose: () => void }) {
  const [selected, setSelected] = useState<ColabPost | null>(posts[0] ?? null);
  const [d, m, y] = [Number(date.slice(8,10)), Number(date.slice(5,7)) - 1, Number(date.slice(0,4))];
  const label = `${d} de ${MONTHS[m]} de ${y}`;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(10,8,30,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(135deg,rgba(28,24,60,0.97),rgba(18,14,48,0.97))', border: '1px solid rgba(124,111,255,0.25)', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(124,111,255,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ color: '#f0eeff', margin: 0, fontSize: 16, fontWeight: 600 }}>📅 {label}</h3>
          <button onClick={onClose} className="colab-btn-ghost" style={{ padding: '4px 10px', fontSize: 16 }}>✕</button>
        </div>
        {posts.length === 0 ? (
          <p style={{ color: '#9b93c8', textAlign: 'center', padding: '2rem 0' }}>Nenhum post neste dia.</p>
        ) : (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 140 }}>
              {posts.map(p => (
                <div key={p.id} onClick={() => setSelected(p)} style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: selected?.id === p.id ? (TYPE_COLOR[p.contentType] ?? '#7c6fff') + '33' : 'rgba(255,255,255,0.04)', border: `1px solid ${selected?.id === p.id ? (TYPE_COLOR[p.contentType] ?? '#7c6fff') + '66' : 'rgba(124,111,255,0.1)'}`, transition: 'all 0.15s' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: TYPE_COLOR[p.contentType] ?? '#7c6fff', marginBottom: 2, textTransform: 'uppercase' }}>{p.contentType}</div>
                  <div style={{ fontSize: 12, color: '#e0d9ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>{p.title}</div>
                </div>
              ))}
            </div>
            {selected && (
              <div style={{ flex: 1 }}>
                <MediaThumb post={selected} />
                <div style={{ fontSize: 14, fontWeight: 600, color: '#f0eeff', marginBottom: 6 }}>{selected.title}</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: (TYPE_COLOR[selected.contentType] ?? '#7c6fff') + '33', color: TYPE_COLOR[selected.contentType] ?? '#7c6fff' }}>{selected.contentType}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.07)', color: STATUS_COLOR[selected.status] ?? '#9b93c8' }}>{STATUS_LABEL[selected.status] ?? selected.status}</span>
                  {selected.network && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.07)', color: '#9b93c8' }}>{selected.network}</span>}
                </div>
                {selected.caption && <p style={{ fontSize: 12, color: '#b8b0e0', lineHeight: 1.5, margin: 0 }}>{selected.caption}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ColabCalendar({ posts = [], onDayClick }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [modalDate, setModalDate] = useState<string | null>(null);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const postsByDate: Record<string, ColabPost[]> = {};
  posts.forEach(p => {
    if (!postsByDate[p.date]) postsByDate[p.date] = [];
    postsByDate[p.date].push(p);
  });

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }
  function prev() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function next() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }
  function handleDayClick(ds: string) { setModalDate(ds); onDayClick(ds); }

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const modalPosts = modalDate ? (postsByDate[modalDate] ?? []) : [];

  return (
    <>
      <div className="colab-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <button className="colab-btn-ghost" onClick={prev} style={{ padding: '6px 14px' }}>‹</button>
          <h2 style={{ color: '#f0eeff', fontWeight: 600, fontSize: 18, margin: 0 }}>{MONTHS[month]} {year}</h2>
          <button className="colab-btn-ghost" onClick={next} style={{ padding: '6px 14px' }}>›</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
          {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#9b93c8', padding: '4px 0' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />;
            const ds = dateStr(day);
            const dayPosts = postsByDate[ds] || [];
            const isToday = ds === today.toISOString().slice(0,10);
            const firstPost = dayPosts[0];
            return (
              <div key={ds} onClick={() => handleDayClick(ds)}
                style={{ minHeight: 64, borderRadius: 8, padding: '6px 8px', cursor: 'pointer', background: isToday ? 'rgba(124,111,255,0.18)' : 'rgba(255,255,255,0.03)', border: isToday ? '1px solid rgba(124,111,255,0.5)' : '1px solid rgba(124,111,255,0.08)', transition: 'background 0.15s', overflow: 'hidden' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,111,255,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.background = isToday ? 'rgba(124,111,255,0.18)' : 'rgba(255,255,255,0.03)')}
              >
                <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? '#b39dff' : '#9b93c8' }}>{day}</span>
                {firstPost?.mediaUrl && (
                  <div style={{ marginTop: 4, width: '100%', aspectRatio: '1/1', borderRadius: 4, overflow: 'hidden' }}>
                    {firstPost.mediaType === 'video'
                      ? <div style={{ width: '100%', height: '100%', background: (TYPE_COLOR[firstPost.contentType] ?? '#7c6fff') + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>▶</div>
                      : <img src={firstPost.mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    }
                  </div>
                )}
                <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {dayPosts.slice(0, firstPost?.mediaUrl ? 1 : 3).map(p => (
                    <div key={p.id} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: (TYPE_COLOR[p.contentType] ?? '#7c6fff') + '33', color: TYPE_COLOR[p.contentType] ?? '#7c6fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                  ))}
                  {dayPosts.length > (firstPost?.mediaUrl ? 1 : 3) && (
                    <div style={{ fontSize: 10, color: '#9b93c8' }}>+{dayPosts.length - (firstPost?.mediaUrl ? 1 : 3)} mais</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {modalDate && <DayModal date={modalDate} posts={modalPosts} onClose={() => setModalDate(null)} />}
    </>
  );
}
