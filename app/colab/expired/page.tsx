export default function ExpiredPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1a4e 0%, #0d1b4b 40%, #1a0a3e 100%)',
    }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>⏰</div>
        <h1 style={{ color: '#f0eeff', fontWeight: 700, fontSize: 28, margin: '0 0 12px' }}>
          Sessão Expirada
        </h1>
        <p style={{ color: '#9b93c8', fontSize: 15, margin: '0 0 24px' }}>
          Seu acesso ao AHA Social Colab expirou.<br />Solicite um novo convite ao seu social media.
        </p>
      </div>
    </div>
  );
}
