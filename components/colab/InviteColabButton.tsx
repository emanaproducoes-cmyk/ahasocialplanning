'use client';
import { useState } from 'react';
import { createColabInvite } from '@/lib/colab/firestore';

interface Props { adminUid: string; adminEmail: string; agencyName: string; }

export default function InviteColabButton({ adminUid, adminEmail, agencyName }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    if (!email) return;
    setLoading(true);
    const { token } = await createColabInvite({ adminUid, adminEmail, agencyName, clientEmail: email, clientName: name });
    const url = `${window.location.origin}/colab/invite/${token}`;
    setLink(url);
    try {
      await fetch('/api/colab/notify-rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, name, agencyName, link: url }),
      });
    } catch {}
    setLoading(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const btnPrimary: React.CSSProperties = {
    width: '100%', padding: '11px', borderRadius: 10, border: 'none',
    background: 'linear-gradient(135deg, #7c6fff, #4f8fff)',
    color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  };
  const btnGhost: React.CSSProperties = {
    width: '100%', padding: '11px', borderRadius: 10,
    border: '1px solid rgba(124,111,255,0.3)',
    background: 'transparent', color: '#9b93c8', fontSize: 14, cursor: 'pointer',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid rgba(124,111,255,0.25)',
    background: 'rgba(255,255,255,0.06)', color: '#f0eeff',
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };

  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        padding: '8px 18px', borderRadius: 8, border: 'none',
        background: 'linear-gradient(135deg, #7c6fff, #4f8fff)',
        color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
      }}>
        + Convidar para Colab
      </button>

      {open && (
        <div onClick={e => { if (e.target === e.currentTarget) { setOpen(false); setLink(''); }}}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}>
          <div style={{
            background: '#12122a', border: '1px solid rgba(124,111,255,0.25)',
            borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 400,
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ color: '#f0eeff', fontWeight: 700, fontSize: 18, margin: 0 }}>Convidar Cliente</h3>
              <button onClick={() => { setOpen(false); setLink(''); }} style={{
                background: 'none', border: 'none', color: '#9b93c8', fontSize: 20, cursor: 'pointer', lineHeight: 1,
              }}>✕</button>
            </div>

            {!link ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#9b93c8', display: 'block', marginBottom: 6 }}>Nome do cliente</label>
                  <input style={inputStyle} placeholder="Ex: Maria Silva" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#9b93c8', display: 'block', marginBottom: 6 }}>E-mail do cliente *</label>
                  <input style={inputStyle} placeholder="cliente@email.com" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  <button style={{ ...btnPrimary, opacity: loading || !email ? 0.6 : 1 }}
                    onClick={handleGenerate} disabled={loading || !email}>
                    {loading ? 'Gerando link...' : 'Gerar e Enviar Convite'}
                  </button>
                  <button style={btnGhost} onClick={() => setOpen(false)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: 'rgba(124,111,255,0.1)', border: '1px solid rgba(124,111,255,0.2)', borderRadius: 8, padding: '12px 14px' }}>
                  <p style={{ fontSize: 11, color: '#9b93c8', margin: '0 0 6px' }}>LINK DE CONVITE</p>
                  <p style={{ color: '#b39dff', fontSize: 12, margin: 0, wordBreak: 'break-all' }}>{link}</p>
                </div>
                <p style={{ color: '#9b93c8', fontSize: 12, margin: 0 }}>
                  ✅ E-mail enviado para <strong style={{ color: '#f0eeff' }}>{email}</strong>
                </p>
                <button style={btnPrimary} onClick={handleCopy}>
                  {copied ? '✓ Copiado!' : 'Copiar Link'}
                </button>
                <button style={btnGhost} onClick={() => { setOpen(false); setLink(''); setEmail(''); setName(''); }}>
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
