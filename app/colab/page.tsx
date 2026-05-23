'use client';
import { useState } from 'react';
import { useColabSession } from '@/lib/colab/useColabSession';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ColabShell from '@/components/colab/ColabShell';
import ColabCalendar from '@/components/colab/ColabCalendar';
import ColabPlanning from '@/components/colab/ColabPlanning';
import ColabRatings from '@/components/colab/ColabRatings';

export type NavSection = 'calendar' | 'planning' | 'ratings';

export default function ColabPage() {
  const { session, loading } = useColabSession();
  const router = useRouter();
  const [section, setSection] = useState<NavSection>('calendar');

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/colab/expired');
    }
  }, [session, loading, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
        background: '#F1F5F9',
      }}>
        <div style={{
          width: 36, height: 36,
          border: '3px solid #E2E8F0',
          borderTopColor: '#0F172A',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#64748B', fontSize: 14, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Carregando Colab…
        </p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <ColabShell session={session} section={section} onNavigate={setSection}>
      {section === 'calendar' && <ColabCalendar session={session} />}
      {section === 'planning' && <ColabPlanning session={session} />}
      {section === 'ratings'  && <ColabRatings  session={session} />}
    </ColabShell>
  );
}
