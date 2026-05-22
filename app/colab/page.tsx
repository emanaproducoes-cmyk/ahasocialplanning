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
    getColabPosts(session.adminUid).then(p => { console.log("[Colab] posts:", p.length, JSON.stringify(p[0])); setPosts(p); }).catch(e => console.error("[Colab] ERRO:", e));
    getColabPlanning(session.adminUid).then(setPlannings);
  }, [session]);

  if (loading || !session) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0a1a' }}>
      <p style={{ color:'#9b93c8' }}>Carregando...</p>
    </div>
  );

  const selectedPosts = selectedDate ? posts.filter(p => p.date === selectedDate) : [];

  return (
    <ColabShell>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ color: '#f0eeff', fontWeight: 700, fontSize: 24, margin: '0 0 4px' }}>
            Olá, {session.clientName || session.clientEmail} 👋
          </h1>
          <p style={{ color: '#9b93c8', fontSize: 14, margin: 0 }}>
            Bem-vindo ao seu calendário de conteúdo — {session.agencyName}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
          {(['calendario','planejamento','avaliacao'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: '8px 20px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                background: tab === t ? 'linear-gradient(135deg,#7c6fff,#4f8fff)' : 'rgba(255,255,255,0.06)',
                color: tab === t ? '#fff' : '#9b93c8',
              }}>
              {t === 'calendario' ? 'Calendário' : t === 'planejamento' ? 'Planejamento' : 'Avaliação'}
            </button>
          ))}
        </div>

        {tab === 'calendario' && (
          <>
            <ColabCalendar posts={posts} onDayClick={(date: string) => setSelectedDate(date)} />
            {selectedDate && (
              <div style={{ marginTop:'1rem', background:'rgba(124,111,255,0.08)', border:'1px solid rgba(124,111,255,0.15)', borderRadius:14, padding:'1.5rem' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
                  <h3 style={{ color:'#f0eeff', fontWeight:600, fontSize:15, margin:0 }}>
                    Conteúdos — {selectedDate}
                  </h3>
                  <button onClick={() => setSelectedDate(null)}
                    style={{ background:'none', border:'none', color:'#9b93c8', fontSize:18, cursor:'pointer' }}>✕</button>
                </div>
                {selectedPosts.length === 0 ? (
                  <p style={{ color:'#9b93c8', fontSize:14 }}>Nenhum conteúdo agendado para este dia.</p>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {selectedPosts.map(p => (
                      <div key={p.id} style={{ background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'12px 16px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'rgba(124,111,255,0.2)', color:'#b39dff' }}>{p.contentType}</span>
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'rgba(79,143,255,0.2)', color:'#6fcfff' }}>{p.network}</span>
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'rgba(255,255,255,0.08)', color:'#9b93c8' }}>{p.status}</span>
                        </div>
                        <p style={{ color:'#f0eeff', fontWeight:500, fontSize:14, margin:'0 0 4px' }}>{p.title}</p>
                        {p.caption && <p style={{ color:'#9b93c8', fontSize:13, margin:0 }}>{p.caption}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
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
