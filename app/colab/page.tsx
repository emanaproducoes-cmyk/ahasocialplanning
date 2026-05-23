'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useColabSession } from '@/lib/colab/useColabSession';
import ColabShell from '@/components/colab/ColabShell';
import ColabCalendar from '@/components/colab/ColabCalendar';
import ColabPlanning from '@/components/colab/ColabPlanning';
import ColabRatings from '@/components/colab/ColabRatings';
import { getColabPosts, getColabPlanning } from '@/lib/colab/firestore';
import { ColabPost, ColabPlanning as ColabPlanningType } from '@/lib/colab/types';

export default function ColabPage() {
  const { session, loading } = useColabSession();
  const router = useRouter();
  const [posts, setPosts] = useState<ColabPost[]>([]);
  const [plannings, setPlannings] = useState<ColabPlanningType[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [tab, setTab] = useState<'calendario' | 'planejamento' | 'avaliacao'>('calendario');

  useEffect(() => {
    if (!loading && !session) router.push('/colab/expired');
  }, [session, loading, router]);

  useEffect(() => {
    if (!session) return;
    getColabPosts(session.adminUid).then(p => { console.log('[Colab] posts carregados:', p.length); setPosts(p); }).catch(e => console.error('[Colab] ERRO:', e));
    getColabPlanning(session.adminUid).then(setPlannings);
  }, [session]);

  if (loading || !session) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F1F5F9' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:36, height:36, border:'3px solid #E2E8F0', borderTopColor:'#4F46E5', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
        <p style={{ color:'#64748B', fontSize:13, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Carregando…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const now = new Date();
  const monthPosts = posts.filter(p => {
    const d = new Date(p.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const published = monthPosts.filter(p => p.status === 'publicado').length;
  const inProd    = monthPosts.filter(p => p.status === 'em_producao').length;
  const planned   = monthPosts.filter(p => p.status === 'planejado').length;

  const TABS = [
    { id: 'calendario',   label: '📅 Calendário'   },
    { id: 'planejamento', label: '📋 Planejamento'  },
    { id: 'avaliacao',    label: '⭐ Avaliações'     },
  ] as const;

  return (
    <ColabShell>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* ── HERO ── */}
      <div style={{ background:'#fff', borderBottom:'1px solid #E2E8F0' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'20px 28px 0' }}>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:16 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                Olá, {session.clientName?.split(' ')[0]} 👋
              </div>
              <h1 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:22, color:'#0F172A', letterSpacing:'-0.02em', margin:'0 0 3px' }}>
                Calendário de Conteúdo
              </h1>
              <p style={{ color:'#64748B', fontSize:13, margin:0 }}>
                Acompanhe e visualize todo o planejamento — {session.agencyName}
              </p>
            </div>
          </div>

          {/* Stats bar */}
          <div style={{ display:'flex', gap:0, borderTop:'1px solid #F1F5F9', paddingTop:12, marginBottom:0 }}>
            {[
              { label:'Posts no mês', value: monthPosts.length, color:'#0F172A' },
              { label:'Publicados',   value: published,          color:'#059669' },
              { label:'Em produção',  value: inProd,             color:'#D97706' },
              { label:'Planejados',   value: planned,            color:'#4F46E5' },
            ].map((s, i) => (
              <div key={s.label} style={{ paddingRight:24, marginRight:24, borderRight: i < 3 ? '1px solid #F1F5F9' : 'none', paddingBottom:14 }}>
                <div style={{ fontSize:10, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{s.label}</div>
                <div style={{ fontSize:22, fontWeight:800, color:s.color, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:0, marginTop:4 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ padding:'10px 20px', background:'none', border:'none', borderBottom: tab === t.id ? '2px solid #4F46E5' : '2px solid transparent', cursor:'pointer', fontSize:13, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? '#4F46E5' : '#64748B', fontFamily:"'Plus Jakarta Sans',sans-serif", transition:'all 0.15s', marginBottom:-1 }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth:1100, margin:'24px auto', padding:'0 28px' }}>
        {tab === 'calendario' && (
          <ColabCalendar posts={posts} onDayClick={(date: string) => setSelectedDate(date)} />
        )}
        {tab === 'planejamento' && (
          <ColabPlanning adminUid={session.adminUid} plannings={plannings} />
        )}
        {tab === 'avaliacao' && (
          <ColabRatings adminUid={session.adminUid} />
        )}
      </div>
    </ColabShell>
  );
}
