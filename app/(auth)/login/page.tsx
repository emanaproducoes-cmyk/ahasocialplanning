'use client';

import { useState, useEffect } from 'react';
import { useRouter }           from 'next/navigation';
import { useForm }             from 'react-hook-form';
import { zodResolver }         from '@hookform/resolvers/zod';
import { z }                   from 'zod';
import { useAuth }             from '@/lib/hooks/useAuth';
import { cn }                  from '@/lib/utils/cn';
import { showToast }           from '@/components/ui/Toast';

const loginSchema = z.object({
  email:    z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, loginWithEmail, loginWithGoogle, resetPassword, error, clearError } = useAuth();

  const [showPass,   setShowPass]   = useState(false);
  const [googleLoad, setGoogleLoad] = useState(false);
  const [resetMode,  setResetMode]  = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent,  setResetSent]  = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting }, getValues } =
    useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);

  const onSubmit = async (data: LoginForm) => {
    clearError();
    try { await loginWithEmail(data.email, data.password); router.replace('/dashboard'); } catch {}
  };

  const handleGoogle = async () => {
    clearError(); setGoogleLoad(true);
    try { await loginWithGoogle(); router.replace('/dashboard'); } catch {}
    finally { setGoogleLoad(false); }
  };

  const handleReset = async () => {
    const email = resetEmail || getValues('email');
    if (!email) { showToast('Digite seu e-mail primeiro', 'warning'); return; }
    try { await resetPassword(email); setResetSent(true); showToast('E-mail de recuperação enviado!', 'success'); } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8F7FF' }}>
        <div className="w-10 h-10 border-[3px] border-orange-200 border-t-[#FF5C00] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Aileron', sans-serif" }}>

      {/* ══ PAINEL ESQUERDO ══════════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex lg:w-[60%] flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #FF5C00 0%, #FF8C00 50%, #FFB800 100%)' }}
      >
        {/* Círculos decorativos */}
        <div className="absolute -top-28 -left-28 w-96 h-96 bg-white/10 rounded-full" />
        <div className="absolute -bottom-36 -right-36 w-[500px] h-[500px] bg-white/8 rounded-full" />
        <div className="absolute top-1/3 right-12 w-52 h-52 bg-white/5 rounded-full" />

        <div className="relative z-10 flex flex-col h-full px-14 py-12">

          {/* Logo topo */}
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo_aha.png" alt="AHA" className="h-10 w-auto" />
            <span
              style={{ fontFamily: "'Aileron', sans-serif", fontWeight: 600, fontSize: '13px', letterSpacing: '0.08em' }}
              className="text-white/80 uppercase"
            >
              Social Planning
            </span>
          </div>

          {/* Destaque central — AHA gigante */}
          <div className="flex-1 flex flex-col justify-center">

            {/* AHA em StribeMarker com cores do logo (amarelo/dourado) */}
            <div className="mb-2 leading-none" style={{ lineHeight: 0.85 }}>
              <span
                style={{
                  fontFamily: "'StribeMarker', cursive",
                  fontSize: 'clamp(110px, 14vw, 180px)',
                  color: '#FFD700',
                  textShadow: '0 4px 24px rgba(0,0,0,0.18), 0 2px 0 #E6A800',
                  display: 'block',
                  letterSpacing: '-0.01em',
                }}
              >
                AHA
              </span>
            </div>

            {/* Social Planning em Aileron, logo abaixo */}
            <div className="mb-10">
              <span
                style={{
                  fontFamily: "'Aileron', sans-serif",
                  fontWeight: 700,
                  fontSize: 'clamp(18px, 2.2vw, 28px)',
                  color: 'rgba(255,255,255,0.92)',
                  letterSpacing: '0.25em',
                  textTransform: 'uppercase',
                  display: 'block',
                }}
              >
                Social Planning
              </span>
              <span
                style={{
                  fontFamily: "'Aileron', sans-serif",
                  fontWeight: 400,
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.55)',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                Gestão de Conteúdo
              </span>
            </div>

            {/* Tagline */}
            <p style={{ fontFamily: "'Aileron', sans-serif", fontWeight: 400 }}
              className="text-white/80 text-lg mb-8 max-w-md leading-relaxed">
              A plataforma completa para agências que gerenciam redes sociais com inteligência.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-3">
              {['📅 Agendamento multi-plataforma','✅ Aprovação com link direto','📊 Dashboard em tempo real','🚀 Gestão de Campanhas'].map((f) => (
                <div key={f}
                  className="px-4 py-2 rounded-full bg-white/20 backdrop-blur text-white text-sm font-medium border border-white/30"
                  style={{ fontFamily: "'Aileron', sans-serif" }}
                >
                  {f}
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/35 text-[11px] uppercase tracking-widest"
            style={{ fontFamily: "'Aileron', sans-serif" }}>
            Todos os direitos reservados · AHA Publicita Company
          </p>
        </div>
      </div>

      {/* ══ PAINEL DIREITO ═══════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 py-12 bg-white">
        <div className="w-full max-w-sm mx-auto">

          {/* Logo mobile */}
          <div className="lg:hidden mb-8 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo_aha.png" alt="AHA" className="h-9 w-auto" />
            <div>
              <div style={{ fontFamily: "'Aileron', sans-serif", fontWeight: 700 }}
                className="text-[#FF5C00] text-lg leading-none">
                Social Planning
              </div>
              <div style={{ fontFamily: "'Aileron', sans-serif" }}
                className="text-[10px] text-gray-400 tracking-widest uppercase">
                Gestão de Conteúdo
              </div>
            </div>
          </div>

          {/* Título desktop — AHA em StribeMarker, Social Planning em Aileron */}
          <div className="hidden lg:block mb-8">
            <span
              style={{
                fontFamily: "'StribeMarker', cursive",
                fontSize: '42px',
                color: '#FF5C00',
                lineHeight: 1,
                display: 'block',
                letterSpacing: '0.02em',
              }}
            >
              AHA
            </span>
            <span
              style={{
                fontFamily: "'Aileron', sans-serif",
                fontWeight: 700,
                fontSize: '13px',
                color: '#6B7280',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                display: 'block',
                marginTop: '2px',
              }}
            >
              Social Planning
            </span>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-1"
            style={{ fontFamily: "'Aileron', sans-serif", fontWeight: 700 }}>
            Bem-vindo de volta 👋
          </h2>
          <p className="text-sm text-gray-500 mb-8" style={{ fontFamily: "'Aileron', sans-serif" }}>
            Entre na sua conta para gerenciar seus conteúdos.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          {resetMode ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600" style={{ fontFamily: "'Aileron', sans-serif" }}>
                {resetSent ? '✅ E-mail enviado! Verifique sua caixa de entrada.'
                  : 'Informe seu e-mail para receber as instruções de recuperação.'}
              </p>
              {!resetSent && (
                <>
                  <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="seu@email.com"
                    style={{ fontFamily: "'Aileron', sans-serif" }}
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]" />
                  <button onClick={handleReset}
                    style={{ background: 'linear-gradient(135deg,#FF5C00,#FF8C00)', fontFamily: "'Aileron', sans-serif", fontWeight: 600 }}
                    className="w-full py-3 text-white text-sm rounded-lg">
                    Enviar e-mail de recuperação
                  </button>
                </>
              )}
              <button onClick={() => { setResetMode(false); setResetSent(false); clearError(); }}
                className="text-sm text-[#FF5C00] hover:underline" style={{ fontFamily: "'Aileron', sans-serif" }}>
                ← Voltar para o login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5"
                  style={{ fontFamily: "'Aileron', sans-serif" }}>E-MAIL</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">✉️</span>
                  <input type="email" placeholder="seu@email.com" {...register('email')}
                    style={{ fontFamily: "'Aileron', sans-serif" }}
                    className={cn('w-full pl-10 pr-4 py-3 text-sm border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]',
                      errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200')} />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider"
                    style={{ fontFamily: "'Aileron', sans-serif" }}>SENHA</label>
                  <button type="button" onClick={() => setResetMode(true)}
                    className="text-xs text-[#FF5C00] hover:underline" style={{ fontFamily: "'Aileron', sans-serif" }}>
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                  <input type={showPass ? 'text' : 'password'} placeholder="••••••••" {...register('password')}
                    style={{ fontFamily: "'Aileron', sans-serif" }}
                    className={cn('w-full pl-10 pr-10 py-3 text-sm border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]',
                      errors.password ? 'border-red-400 bg-red-50' : 'border-gray-200')} />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
              </div>

              <button type="submit" disabled={isSubmitting}
                style={{ background: 'linear-gradient(135deg,#FF5C00,#FF8C00)', fontFamily: "'Aileron', sans-serif", fontWeight: 700 }}
                className="w-full py-3 disabled:opacity-60 text-white text-sm rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-200/50">
                {isSubmitting ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Entrando...</>
                ) : 'Entrar na plataforma →'}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400" style={{ fontFamily: "'Aileron', sans-serif" }}>ou</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <button type="button" onClick={handleGoogle} disabled={googleLoad}
                className="w-full py-3 border border-gray-200 hover:bg-gray-50 disabled:opacity-60 text-gray-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                style={{ fontFamily: "'Aileron', sans-serif" }}>
                {googleLoad ? (
                  <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Continuar com Google
              </button>

              <div className="text-center pt-2 border-t border-gray-100">
                <p className="text-sm text-gray-500" style={{ fontFamily: "'Aileron', sans-serif" }}>
                  Não tem conta?{' '}
                  <a href="/register" className="text-[#FF5C00] font-semibold hover:underline">
                    Criar conta gratuita →
                  </a>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
