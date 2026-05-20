'use client';
/**
 * app/colab/expired/page.tsx
 * Página exibida quando a sessão do Colab é inválida ou expirou.
 */

export default function ColabExpiredPage() {
  return (
    <div className="colab-root" style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg,#06061A 0%,#0F0526 50%,#06061A 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: '0 24px' }}>
        <div style={{ fontSize: 60, marginBottom: 20 }}>🔐</div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26,
          color: '#fff', letterSpacing: '-0.02em', marginBottom: 10,
        }}>
          Sessão encerrada
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(241,240,255,0.55)', lineHeight: 1.7, marginBottom: 28 }}>
          Seu acesso ao AHA Social Colab expirou ou é inválido. Para entrar novamente, solicite um novo convite ao seu social media.
        </p>
        <a href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'linear-gradient(135deg,#4F46E5,#7C3AED)',
          color: '#fff', borderRadius: 12, padding: '12px 28px',
          fontSize: 14, fontWeight: 600, textDecoration: 'none',
          boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
        }}>
          ← Voltar ao início
        </a>
      </div>
    </div>
  );
}
