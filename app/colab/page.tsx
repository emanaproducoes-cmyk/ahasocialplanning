'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useColabSession } from '@/lib/colab/useColabSession';
import { getColabPosts, getColabPlanning, getColabRatings } from '@/lib/colab/firestore';
import ColabShell from '@/components/colab/ColabShell';
import ColabCalendar from '@/components/colab/ColabCalendar';
import ColabPlanning from '@/components/colab/ColabPlanning';
import ColabRatings from '@/components/colab/ColabRatings';
import type { ColabPost, ColabPlanning as PlanningType, ColabRating } from '@/lib/colab/types';

export default function ColabPage() {
  const { session, loading, isExpired } = useColabSession();
  const router = useRouter();
  const [posts, setPosts] = useState<ColabPost[]>([]);
  const [plannings, setPlannings] = useState<PlanningType[]>([]);
  const [ratings, setRatings] = useState<ColabRating[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'calendar' | 'planning' | 'ratings'>('calendar');
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!session || isExpired()) {
        router.push('/colab/expired');
      }
    }
  }, [session, loading]);

  useEffect(() => {
    if (session?.adminUid) loadData();
  }, [session]);

  async function loadData() {
    setDataLoading(true);
    const [p, pl, r] = await Promise.all([
      getColabPosts(session!.adminUid),
      getColabPlanning(session!.adminUid),
      getColabRatings(session!.adminUid),
    ]);
    setPosts(p);
    setPlannings(pl);
    setRatings(r);
    setDataLoading(false);
  }

  if (loading || dataLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a1a4e 0%, #0d1b4b 40%, #1a0a3e 100%)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(124,111,255,0.2)', borderTopColor: '#7c6fff', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: '#9b93c8', fontSize: 14 }}>Carregando seu calendário...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const dayPosts = selectedDay ? posts.filter(p => p.date === selectedDay) : [];

  const TABS = [
    { key: 'calendar', label: '📅 Calendário' },
    { key: 'planning', label: '📋 Planejamento' },
    { key: 'ratings', label: '⭐ Avaliações' },
  ] as const;

  return (
    <ColabShell>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ color: '#f0eeff', fontWeight: 700, fontSize: 24, margin: '0 0 4px' }}>
            Olá, {session?.clientName || session?.clientEmail?.split('@')[0]} 👋
          </h1>
          <p style={{ color: '#9b93c8', fontSize: 14, margin: 0 }}>
            Acompanhe o calendário de conteúdo da {session?.agencyName}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                background: activeTab === tab.key ? 'linear-gradient(135deg, #7c6fff, #4f8fff)' : 'transparent',
                color: activeTab === tab.key ? '#fff' : '#9b93c8',
                transition: 'all 0.2s',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'calendar' && (
          <>
            <ColabCalendar posts={posts} onDayClick={setSelectedDay} />
            {selectedDay && (
              <div className="colab-card" style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ color: '#f0eeff', fontWeight: 600, fontSize: 16, margin: 0 }}>
                    Conteúdos — {selectedDay}
                  </h3>
                  <button onClick={() => setSelectedDay(null)}
                    style={{ background: 'none', border: 'none', color: '#9b93c8', cursor: 'pointer', fontSize: 18 }}>✕</button>
                </div>
                {dayPosts.length === 0 ? (
                  <p style={{ color: '#9b93c8', fontSize: 13, textAlign: 'center', padding: '1rem' }}>Nenhum conteúdo agendado para este dia.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {dayPosts.map(p => (
                      <div key={p.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(124,111,255,0.1)' }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, background: 'rgba(124,111,255,0.2)', color: '#b39dff', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>{p.contentType}</span>
                          <span style={{ fontSize: 11, background: 'rgba(79,143,255,0.2)', color: '#6fcfff', padding: '2px 8px', borderRadius: 4 }}>{p.network}</span>
                          <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.06)', color: '#9b93c8', padding: '2px 8px', borderRadius: 4 }}>{p.status}</span>
                        </div>
                        <p style={{ color: '#f0eeff', fontWeight: 600, fontSize: 15, margin: '0 0 4px' }}>{p.title}</p>
                        {p.caption && <p style={{ color: '#9b93c8', fontSize: 13, margin: '0 0 4px' }}>{p.caption}</p>}
                        {p.theme && <p style={{ color: '#7c6fff', fontSize: 12, margin: 0 }}>Tema: {p.theme}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'planning' && (
          <ColabPlanning adminUid={session!.adminUid} plannings={plannings} onSave={loadData} />
        )}

        {activeTab === 'ratings' && (
          <ColabRatings adminUid={session!.adminUid} ratings={ratings} onSave={loadData} />
        )}
      </div>
    </ColabShell>
  );
}
