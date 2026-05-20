'use client';
import { useState } from 'react';
import { ColabPost } from '@/lib/colab/types';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const TYPE_COLOR: Record<string, string> = {
  reels: '#7c6fff', carrossel: '#4f8fff', story: '#b39dff',
  feed: '#6fcfff', tiktok: '#ff6fb0', youtube: '#ff6f6f',
};

interface Props {
  posts: ColabPost[];
  onDayClick: (date: string) => void;
}

export default function ColabCalendar({ posts, onDayClick }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

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

  function prev() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="colab-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button className="colab-btn-ghost" onClick={prev} style={{ padding: '6px 14px' }}>‹</button>
        <h2 style={{ color: '#f0eeff', fontWeight: 600, fontSize: 18, margin: 0 }}>
          {MONTHS[month]} {year}
        </h2>
        <button className="colab-btn-ghost" onClick={next} style={{ padding: '6px 14px' }}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#9b93c8', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const ds = dateStr(day);
          const dayPosts = postsByDate[ds] || [];
          const isToday = ds === today.toISOString().slice(0,10);
          return (
            <div key={ds} onClick={() => onDayClick(ds)}
              style={{
                minHeight: 64, borderRadius: 8, padding: '6px 8px', cursor: 'pointer',
                background: isToday ? 'rgba(124,111,255,0.18)' : 'rgba(255,255,255,0.03)',
                border: isToday ? '1px solid rgba(124,111,255,0.5)' : '1px solid rgba(124,111,255,0.08)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,111,255,0.12)')}
              onMouseLeave={e => (e.currentTarget.style.background = isToday ? 'rgba(124,111,255,0.18)' : 'rgba(255,255,255,0.03)')}
            >
              <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? '#b39dff' : '#9b93c8' }}>{day}</span>
              <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dayPosts.slice(0,3).map(p => (
                  <div key={p.id} style={{
                    fontSize: 10, padding: '1px 5px', borderRadius: 4,
                    background: TYPE_COLOR[p.contentType] + '33',
                    color: TYPE_COLOR[p.contentType],
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{p.title}</div>
                ))}
                {dayPosts.length > 3 && (
                  <div style={{ fontSize: 10, color: '#9b93c8' }}>+{dayPosts.length - 3} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
