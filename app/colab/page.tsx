'use client';
/**
 * app/colab/page.tsx
 * Página principal do AHA Social Colab.
 */

import { useState, useEffect }  from 'react';
import { useRouter }            from 'next/navigation';
import { useColabSession }      from '@/lib/colab/useColabSession';
import ColabShell           from '@/components/colab/ColabShell';
import ColabCalendar        from '@/components/colab/ColabCalendar';
import ColabPlanning        from '@/components/colab/ColabPlanning';
import ColabRatings         from '@/components/colab/ColabRatings';

type NavSection = 'calendar' | 'planning' | 'ratings';

export default function ColabPage() {
  const { session, loading, clearSession } = useColabSession();
  const router  = useRouter();
  const [section, setSection] = useState<NavSection>('calendar');

  useEffect(() => {
    if (!loading && (!session || !session.isActive)) {
      router.push('/colab/expired');
    }
  }, [loading, session, router]);

  const handleLogout = () => {
    clearSession();
    router.push('/colab/expired');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#06061A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 12, color: 'rgba(241,240,255,0.5)',
        fontFamily: 'system-ui,sans-serif',
      }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(124,58,237,0.2)', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ fontSize: 14 }}>Carregando Colab…</p>
      </div>
    );
  }

  if (!session || !session.isActive) return null;

  return (
    <ColabShell
      session={session}
      section={section}
      onNavigate={setSection}
      onLogout={handleLogout}
    >
      {section === 'calendar' && <ColabCalendar session={session} />}
      {section === 'planning' && <ColabPlanning session={session} />}
      {section === 'ratings'  && <ColabRatings  session={session} />}
    </ColabShell>
  );
}
