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

  function handleCopy() { navigator.clipboard.writeText(link); }

  return (
    <>
      <button className="colab-btn" onClick={() => setOpen(true)} style={{ fontSize: 13, padding: '8px 18px' }}>
        + Convidar para Colab
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={e => { if (e.target === e.currentTarget) { setOpen(false); setLink(''); }}}>
          <div style={{
            background: '#12122a', border: '1px solid rgba(124,111,255,0.2)',
            borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 420,
          }}>
            <h3 style={{ color: '#f0eeff', fontWeight: 600, fontSize: 18, margin: '0 0 1.5rem' }}>
              Convidar Cliente
            </h3>

            {!link ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input className="colab-input" placeholder="Nome do cliente" value={name} onChange={e => setName(e.target.value)} />
                <input className="colab-input" placeholder="E-mail do cliente" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                <button className="colab-btn" onClick={handleGenerate} disabled={loading || !email}
                  style={{ padding: '10px', fontSize: 14, marginTop: 4 }}>
                  {loading ? 'Gerando link...' : 'Gerar Link de Convite'}
                </button>
                <button className="colab-btn-ghost" onClick={() => setOpen(false)} style={{ padding: '10px', fontSize: 14 }}>
                  Cancelar
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ color: '#9b93c8', fontSize: 13, margin: 0 }}>Link gerado com sucesso! Copie e envie ao cliente:</p>
                <div style={{ background: 'rgba(124,111,255,0.1)', border: '1px solid rgba(124,111,255,0.2)', borderRadius: 8, padding: '10px 14px' }}>
                  <p style={{ color: '#b39dff', fontSize: 12, margin: 0, wordBreak: 'break-all' }}>{link}</p>
                </div>
                <button className="colab-btn" onClick={handleCopy} style={{ padding: '10px', fontSize: 14 }}>
                  Copiar Link
                </button>
                <button className="colab-btn-ghost" onClick={() => { setOpen(false); setLink(''); setEmail(''); setName(''); }}
                  style={{ padding: '10px', fontSize: 14 }}>
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
