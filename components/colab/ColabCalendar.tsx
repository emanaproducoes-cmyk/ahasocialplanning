'use client';
import { useState } from 'react';
import { ColabPost } from '@/lib/colab/types';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const STATUS: Record<string, { label:string; dot:string; pill:string; text:string }> = {
  planejado:          { label:'Planejado',    dot:'#64748B', pill:'rgba(100,116,139,0.12)', text:'#334155' },
  rascunho:           { label:'Rascunho',     dot:'#64748B', pill:'rgba(100,116,139,0.12)', text:'#334155' },
  conteudo:           { label:'Conteúdo',     dot:'#3B82F6', pill:'rgba(59,130,246,0.13)',  text:'#1D4ED8' },
  em_producao:        { label:'Em produção',  dot:'#D97706', pill:'rgba(217,119,6,0.13)',   text:'#92400E' },
  revisao:            { label:'Revisão',      dot:'#D97706', pill:'rgba(217,119,6,0.13)',   text:'#92400E' },
  aprovacao_cliente:  { label:'Ap. Cliente',  dot:'#8B5CF6', pill:'rgba(139,92,246,0.13)', text:'#5B21B6' },
  review:             { label:'Ap. Cliente',  dot:'#8B5CF6', pill:'rgba(139,92,246,0.13)', text:'#5B21B6' },
  em_analise:         { label:'Em Análise',   dot:'#6366F1', pill:'rgba(99,102,241,0.13)', text:'#3730A3' },
  aprovado:           { label:'Aprovado',     dot:'#10B981', pill:'rgba(16,185,129,0.13)', text:'#047857' },
  rejeitado:          { label:'Rejeitado',    dot:'#EF4444', pill:'rgba(239,68,68,0.13)',  text:'#B91C1C' },
  publicado:          { label:'Publicado',    dot:'#0EA5E9', pill:'rgba(14,165,233,0.13)', text:'#0369A1' },
};

const PLATFORM_ICON: Record<string,string> = {
  instagram:'📸', facebook:'👍', youtube:'▶️', tiktok:'🎵',
  linkedin:'💼',  threads:'🧵',  pinterest:'📌', google_business:'🏢',
  ig:'📸',
};

interface Props {
  posts: ColabPost[];
  onDayClick: (date: string) => void;
}

function DayNumber({ day, isToday }: { day: number; isToday: boolean }) {
  if (isToday) return (
    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:22, height:22, borderRadius:'50%', background:'#4F46E5', color:'#fff', fontSize:11, fontWeight:800 }}>{day}</span>
  );
  return <span style={{ fontSize:12, fontWeight:600, color:'#94A3B8' }}>{day}</span>;
}

function PostModal({ post, onClose }: { post: ColabPost; onClose: () => void }) {
  const [tab, setTab] = useState<'info'|'comments'>('info');
  const cfg = STATUS[post.status] ?? STATUS.planejado;
  const platforms = post.network ? [post.network] : [];

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(6px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:520, maxHeight:'88vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(15,23,42,0.2)' }}>

        {/* Header */}
        <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ flex:1, minWidth:0, paddingRight:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
              <span style={{ padding:'3px 10px', borderRadius:999, background:cfg.pill, color:cfg.text, fontSize:11, fontWeight:700, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{cfg.label}</span>
              {platforms.map(pl => <span key={pl} style={{ fontSize:14 }}>{PLATFORM_ICON[pl] ?? '📱'}</span>)}
            </div>
            <h3 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:16, color:'#0F172A', margin:0 }}>{post.title}</h3>
            <div style={{ fontSize:11, color:'#94A3B8', marginTop:4, fontWeight:500 }}>📅 {post.date}</div>
          </div>
          <button onClick={onClose} style={{ background:'#F1F5F9', border:'1px solid #E2E8F0', color:'#64748B', width:30, height:30, borderRadius:'50%', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid #F1F5F9', padding:'0 20px' }}>
          {([['info','📝 Info'],['comments','💬 Comentários']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding:'10px 14px', border:'none', background:'transparent', cursor:'pointer', fontSize:12, fontWeight:700, fontFamily:"'Plus Jakarta Sans',sans-serif", color: tab === id ? '#4F46E5' : '#94A3B8', borderBottom: tab === id ? '2px solid #4F46E5' : '2px solid transparent', marginBottom:-1, transition:'all 0.15s' }}>{label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1, overflow:'auto', padding:'18px 20px' }}>
          {tab === 'info' ? (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {post.mediaUrl && (
                <div style={{ borderRadius:12, overflow:'hidden', maxHeight:240 }}>
                  {post.mediaType === 'video'
                    ? <video src={post.mediaUrl} style={{ width:'100%', maxHeight:240, objectFit:'cover' }} controls />
                    : <img src={post.mediaUrl} alt={post.title} style={{ width:'100%', maxHeight:240, objectFit:'cover', display:'block' }} />
                  }
                </div>
              )}
              {post.caption && (
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Legenda</div>
                  <p style={{ color:'#475569', fontSize:14, lineHeight:1.65, margin:0 }}>{post.caption}</p>
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div style={{ background:'#F8FAFC', borderRadius:10, padding:'10px 14px' }}>
                  <div style={{ fontSize:10, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Formato</div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#0F172A', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{post.contentType}</div>
                </div>
                <div style={{ background:'#F8FAFC', borderRadius:10, padding:'10px 14px' }}>
                  <div style={{ fontSize:10, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Status</div>
                  <div style={{ fontSize:13, fontWeight:700, color:cfg.text, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{cfg.label}</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign:'center', color:'#94A3B8', padding:'32px 0', fontSize:13 }}>
              <div style={{ fontSize:32, marginBottom:8 }}>💬</div>
              Comentários em breve.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NewDayModal({ date, existingPosts, onClose, onViewPost }: {
  date: string; existingPosts: ColabPost[];
  onClose: () => void; onViewPost: (p: ColabPost) => void;
}) {
  const [d, m, y] = [Number(date.slice(8,10)), Number(date.slice(5,7))-1, Number(date.slice(0,4))];
  const WEEK = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const weekDay = WEEK[new Date(y, m, d).getDay()];
  const label = `${weekDay}, ${d} de ${MONTHS[m]}`;

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(6px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:420, boxShadow:'0 20px 60px rgba(15,23,42,0.2)', overflow:'hidden' }}>

        <div style={{ padding:'18px 22px 14px', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <h3 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:16, color:'#0F172A', margin:'0 0 3px' }}>
              {existingPosts.length > 0 ? `Posts em ${d}/${m+1}` : 'Dia sem posts'}
            </h3>
            <div style={{ fontSize:12, color:'#94A3B8', textTransform:'capitalize' }}>📅 {label}</div>
          </div>
          <button onClick={onClose} style={{ background:'#F1F5F9', border:'1px solid #E2E8F0', color:'#64748B', width:30, height:30, borderRadius:'50%', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>

        <div style={{ padding:'18px 22px' }}>
          {existingPosts.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {existingPosts.map(p => {
                const cfg = STATUS[p.status] ?? STATUS.planejado;
                return (
                  <div key={p.id} onClick={() => onViewPost(p)}
                    style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:10, background:'#F8FAFC', border:'1px solid #E2E8F0', cursor:'pointer', transition:'all 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='#C7D2FE'; e.currentTarget.style.background='#EEF2FF'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.background='#F8FAFC'; }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:cfg.dot, flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:13, color:'#0F172A', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.title}</div>
                      <div style={{ fontSize:11, color:cfg.text, marginTop:1, fontWeight:600 }}>{cfg.label}</div>
                    </div>
                    <span style={{ color:'#CBD5E1', fontSize:14 }}>›</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'24px 0' }}>
              <div style={{ fontSize:36, marginBottom:8 }}>📅</div>
              <p style={{ color:'#64748B', fontSize:13, margin:'0 0 16px', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Nenhum post agendado para este dia.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ColabCalendar({ posts = [], onDayClick }: Props) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedPost, setSelectedPost]  = useState<ColabPost | null>(null);
  const [selectedDay, setSelectedDay]    = useState<string | null>(null);
  const [filterStatus, setFilterStatus]  = useState('all');

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();

  const postsByDate: Record<string, ColabPost[]> = {};
  posts.forEach(p => {
    if (!postsByDate[p.date]) postsByDate[p.date] = [];
    postsByDate[p.date].push(p);
  });

  const statusCounts: Record<string,number> = {};
  posts.forEach(p => { statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1; });

  function dateStr(day: number) {
    return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }
  function prev() { if (month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }
  function next() { if (month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }

  const filteredPosts = filterStatus === 'all' ? posts : posts.filter(p => p.status === filterStatus);
  const filteredByDate: Record<string, ColabPost[]> = {};
  filteredPosts.forEach(p => {
    if (!filteredByDate[p.date]) filteredByDate[p.date] = [];
    filteredByDate[p.date].push(p);
  });

  const cells: (number|null)[] = [];
  for (let i=0; i<firstDay; i++) cells.push(null);
  for (let d=1; d<=daysInMonth; d++) cells.push(d);

  const todayStr = today.toISOString().slice(0,10);

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap')`}</style>

      {/* Status filter pills */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
        <button onClick={() => setFilterStatus('all')} style={{ padding:'4px 12px', borderRadius:999, border:'none', cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:"'Plus Jakarta Sans',sans-serif", background: filterStatus==='all' ? '#0F172A' : '#fff', color: filterStatus==='all' ? '#F8FAFC' : '#64748B', outline: filterStatus==='all' ? 'none' : '1px solid #E2E8F0', transition:'all 0.15s' }}>
          Todos ({posts.length})
        </button>
        {Object.entries(statusCounts).map(([s, count]) => {
          const cfg = STATUS[s];
          if (!cfg) return null;
          const active = filterStatus === s;
          return (
            <button key={s} onClick={() => setFilterStatus(s === filterStatus ? 'all' : s)}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:999, border:'none', cursor:'pointer', fontSize:11, fontWeight:600, fontFamily:"'Plus Jakarta Sans',sans-serif", background: active ? cfg.pill : '#fff', color: active ? cfg.text : '#64748B', outline:`1px solid ${active ? cfg.dot+'60' : '#E2E8F0'}`, transition:'all 0.15s' }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.dot, display:'inline-block' }} />
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Calendar */}
      <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:16, overflow:'hidden', boxShadow:'0 1px 3px rgba(15,23,42,0.06)' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid #F1F5F9' }}>
          <button onClick={prev} style={{ width:32, height:32, borderRadius:8, border:'1px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#64748B', transition:'all 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='#F1F5F9';e.currentTarget.style.color='#0F172A'}}
            onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.color='#64748B'}}>‹</button>
          <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:16, color:'#0F172A', textTransform:'capitalize' }}>
            {MONTHS[month]} {year}
          </div>
          <button onClick={next} style={{ width:32, height:32, borderRadius:8, border:'1px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#64748B', transition:'all 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='#F1F5F9';e.currentTarget.style.color='#0F172A'}}
            onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.color='#64748B'}}>›</button>
        </div>

        {/* Day headers */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid #F1F5F9', background:'#F8FAFC' }}>
          {DAYS.map(d => <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:700, color:'#94A3B8', padding:'8px 0', fontFamily:"'Plus Jakarta Sans',sans-serif", textTransform:'uppercase', letterSpacing:'0.07em' }}>{d}</div>)}
        </div>

        {/* Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} style={{ minHeight:84, borderRight:(i+1)%7!==0?'1px solid #F8FAFC':'none', borderBottom:'1px solid #F8FAFC', background:'#FAFAFA' }} />;
            const ds = dateStr(day);
            const dayPosts = filteredByDate[ds] ?? [];
            const allDayPosts = postsByDate[ds] ?? [];
            const isToday = ds === todayStr;

            return (
              <div key={ds}
                onClick={() => { setSelectedDay(ds); onDayClick(ds); }}
                style={{ minHeight:84, padding:'7px 6px 5px', borderBottom: i < cells.length-7 ? '1px solid #F1F5F9' : 'none', borderRight:(i+1)%7!==0?'1px solid #F1F5F9':'none', background: isToday ? 'rgba(79,70,229,0.04)' : '#fff', cursor:'pointer', transition:'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = isToday ? 'rgba(79,70,229,0.08)' : '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.background = isToday ? 'rgba(79,70,229,0.04)' : '#fff'}
              >
                <div style={{ textAlign:'right', paddingRight:2, marginBottom:4 }}>
                  <DayNumber day={day} isToday={isToday} />
                </div>

                {/* Thumbnail do primeiro post com mídia */}
                {dayPosts[0]?.mediaUrl && (
                  <div style={{ marginBottom:3, borderRadius:5, overflow:'hidden', aspectRatio:'1/1', width:'100%' }}>
                    {dayPosts[0].mediaType === 'video'
                      ? <div style={{ width:'100%', height:'100%', background:'#EEF2FF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>▶</div>
                      : <img src={dayPosts[0].mediaUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                    }
                  </div>
                )}

                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  {dayPosts.slice(0, dayPosts[0]?.mediaUrl ? 1 : 3).map(p => {
                    const cfg = STATUS[p.status] ?? STATUS.planejado;
                    return (
                      <div key={p.id}
                        onClick={e => { e.stopPropagation(); setSelectedPost(p); }}
                        style={{ display:'flex', alignItems:'center', gap:3, padding:'2px 5px', borderRadius:4, background:cfg.pill, cursor:'pointer' }}>
                        <span style={{ width:5, height:5, borderRadius:'50%', background:cfg.dot, flexShrink:0 }} />
                        <span style={{ fontSize:10, fontWeight:600, color:cfg.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{p.title}</span>
                      </div>
                    );
                  })}
                  {allDayPosts.length > (dayPosts[0]?.mediaUrl ? 1 : 3) && (
                    <div style={{ fontSize:9, color:'#94A3B8', fontWeight:700, textAlign:'right', paddingRight:2 }}>+{allDayPosts.length - (dayPosts[0]?.mediaUrl ? 1 : 3)}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedPost && <PostModal post={selectedPost} onClose={() => setSelectedPost(null)} />}
      {selectedDay && !selectedPost && (
        <NewDayModal
          date={selectedDay}
          existingPosts={postsByDate[selectedDay] ?? []}
          onClose={() => setSelectedDay(null)}
          onViewPost={p => { setSelectedDay(null); setSelectedPost(p); }}
        />
      )}
    </>
  );
}
