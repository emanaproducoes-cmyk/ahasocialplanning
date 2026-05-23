'use client';
import { useColabSession } from '@/lib/colab/useColabSession';
import { useRouter } from 'next/navigation';

function initials(name: string) {
  return name.split(' ').slice(0,2).map(w => w[0]?.toUpperCase()).join('');
}

export default function ColabShell({ children }: { children: React.ReactNode }) {
  const { session, clearSession } = useColabSession();
  const router = useRouter();

  const handleLogout = () => {
    clearSession?.();
    router.push('/colab/expired');
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', background:'#F1F5F9', fontFamily:"'Inter', -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
        .colab-nav-btn { display:flex; align-items:center; gap:7px; padding:7px 16px; border-radius:10px; cursor:pointer; border:1px solid transparent; background:transparent; color:rgba(248,250,252,0.52); font-size:13px; font-family:'Plus Jakarta Sans',sans-serif; font-weight:500; transition:all 0.18s; }
        .colab-nav-btn:hover { background:rgba(255,255,255,0.08); border-color:rgba(255,255,255,0.1); color:rgba(248,250,252,0.85); }
        .colab-nav-btn.active { background:rgba(255,255,255,0.12); border-color:rgba(255,255,255,0.16); color:#fff; font-weight:700; }
        .colab-logout:hover { background:rgba(239,68,68,0.16) !important; border-color:rgba(239,68,68,0.3) !important; color:#FCA5A5 !important; }
      `}</style>

      <header style={{ background:'#0F172A', height:58, display:'flex', alignItems:'center', padding:'0 24px', position:'sticky', top:0, zIndex:50, flexShrink:0 }}>
        {/* Brand */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginRight:36, flexShrink:0 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#4F46E5,#7C3AED)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, boxShadow:'0 4px 12px rgba(124,58,237,0.4)' }}>⚡</div>
          <div>
            <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:13, color:'#F8FAFC', letterSpacing:'-0.01em', lineHeight:1.1 }}>Social Colab</div>
            <div style={{ fontSize:10, color:'rgba(248,250,252,0.42)', marginTop:1 }}>{session?.agencyName}</div>
          </div>
        </div>

        {/* Right: online + avatar + name + logout */}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <div style={{ padding:'3px 10px', borderRadius:999, background:'rgba(52,211,153,0.12)', border:'1px solid rgba(52,211,153,0.28)', display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:'#34D399', display:'inline-block' }} />
            <span style={{ fontSize:10, fontWeight:700, color:'#34D399', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Online</span>
          </div>
          <div style={{ width:1, height:24, background:'rgba(255,255,255,0.1)' }} />
          <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#4F46E5,#9333EA)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff', fontFamily:"'Plus Jakarta Sans',sans-serif", flexShrink:0 }}>
            {initials(session?.clientName ?? 'C')}
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#F8FAFC', fontFamily:"'Plus Jakarta Sans',sans-serif", whiteSpace:'nowrap', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis' }}>{session?.clientName}</div>
            <div style={{ fontSize:10, color:'rgba(248,250,252,0.42)', whiteSpace:'nowrap', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis' }}>{session?.clientEmail}</div>
          </div>
          <button onClick={handleLogout} className="colab-logout"
            style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, cursor:'pointer', color:'rgba(248,250,252,0.5)', fontSize:12, padding:'5px 12px', transition:'all 0.15s', fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600 }}>
            Sair
          </button>
        </div>
      </header>

      <main style={{ flex:1, overflow:'auto' }}>{children}</main>

      <footer style={{ background:'#0F172A', height:40, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <span style={{ fontSize:11, color:'rgba(248,250,252,0.3)', fontFamily:"'Plus Jakarta Sans',sans-serif", letterSpacing:'0.01em' }}>
          © 2026 AHA Social Colab · Todos os direitos reservados.
        </span>
      </footer>
    </div>
  );
}
