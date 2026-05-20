'use client';
import { useRouter } from 'next/navigation';

export default function ColabExpiredPage() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a4e 0%, #0d1b4b 40%, #1a0a3e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, sans-serif',
    }}>
      <div style={{
        textAlign: 'center', maxWidth: 420, padding: '2rem',
        background: 'rgba(124,111,255,0.08)',
        border: '1px solid rgba(124,111,255,0.2)',
        borderRadius: 20,
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(124,111,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, margin: '0 auto 1.5rem',
        }}>⏳</div>

        <h1 style={{ color: '#f0eeff', fontWeight: 700, fontSize: 22, margin: '0 0 0.75rem' }}>
          Sessão Encerrada
        </h1>
        <p style={{ color: '#9b93c8', fontSize: 14, lineHeight: 1.6, margin: '0 0 2rem' }}>
          Seu acesso ao AHA Social Colab expirou ou não está mais ativo.
          Entre em contato com o social media responsável para receber um novo convite.
        </p>

        <button
          onClick={() => router.push('/')}
          style={{
            background: 'linear-gradient(135deg, #7c6fff, #4f8fff)',
            color: '#fff', border: 'none', borderRadius: 10,
            padding: '12px 32px', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', width: '100%',
          }}
        >
          Voltar ao Início
        </button>
      </div>
    </div>
  );
}
