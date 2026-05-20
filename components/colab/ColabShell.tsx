'use client';
import { useRouter } from 'next/navigation';
import { useColabSession } from '@/lib/colab/useColabSession';

export default function ColabShell({ children }: { children: React.ReactNode }) {
  const { session, clearSession } = useColabSession();
  const router = useRouter();

  function handleLogout() {
    clearSession();
    router.push('/');
  }

  return (
    <div className="colab-root" style={{ minHeight: '100vh' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 2rem',
        borderBottom: '1px solid rgba(124,111,255,0.15)',
        background: 'rgba(10,10,26,0.6)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c6fff, #4f8fff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: '#fff',
          }}>A</div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#f0eeff', margin: 0 }}>
              AHA Social Colab
            </p>
            <p style={{ fontSize: 11, color: '#9b93c8', margin: 0 }}>
              {session?.agencyName ?? 'Calendário do Cliente'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: 12, color: '#9b93c8' }}>
            {session?.clientEmail}
          </span>
          <button className="colab-btn-ghost" onClick={handleLogout}
            style={{ padding: '6px 16px', fontSize: 12 }}>
            Sair
          </button>
        </div>
      </header>
      <main style={{ padding: '2rem' }}>
        {children}
      </main>
    </div>
  );
}
