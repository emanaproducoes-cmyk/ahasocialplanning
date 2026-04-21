'use client';

import { useState, useEffect } from 'react';
import { useRouter }           from 'next/navigation';
import { useForm }             from 'react-hook-form';
import { zodResolver }         from '@hookform/resolvers/zod';
import { z }                   from 'zod';
import { useAuth }             from '@/lib/hooks/useAuth';
import { cn }                  from '@/lib/utils/cn';
import { showToast }           from '@/components/ui/Toast';

// ─── Validation ───────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email:    z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

const FEATURES = [
  '📅 Agendamento multi-plataforma',
  '✅ Aprovação com link direto',
  '📊 Dashboard em tempo real',
  '🚀 Gestão de Campanhas',
];

export default function LoginPage() {
  const router = useRouter();
  const {
    user,
    loading,
    loginWithEmail,
    loginWithGoogle,
    resetPassword,
    error,
    clearError,
  } = useAuth();

  const [showPass,   setShowPass]   = useState(false);
  const [googleLoad, setGoogleLoad] = useState(false);
  const [resetMode,  setResetMode]  = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent,  setResetSent]  = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  // Redireciona se já estiver logado
  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);

  const onSubmit = async (data: LoginForm) => {
    clearError();
    try {
      await loginWithEmail(data.email, data.password);
      router.replace('/dashboard');
    } catch {
      // erro já setado pelo hook
    }
  };

  const handleGoogle = async () => {
    clearError();
    setGoogleLoad(true);
    try {
      await loginWithGoogle();
      router.replace('/dashboard');
    } catch {
      // erro já setado pelo hook
    } finally {
      setGoogleLoad(false);
    }
  };

  const handleReset = async () => {
    const email = resetEmail || getValues('email');
    if (!email) { showToast('Digite seu e-mail primeiro', 'warning'); return; }
    try {
      await resetPassword(email);
      setResetSent(true);
      showToast('E-mail de recuperação enviado!', 'success');
    } catch {
      // erro setado pelo hook
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F7FF]">
        <div className="w-10 h-10 border-[3px] border-orange-200 border-t-[#FF5C00] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Painel esquerdo ─────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[60%] flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #FF5C00 0%, #FF8C00 50%, #FFB800 100%)' }}
      >
        {/* Círculos decorativos */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-white/10 rounded-full" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-white/10 rounded-full" />
        <div className="absolute top-1/3 -right-16 w-48 h-48 bg-white/5 rounded-full" />

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center border border-white/30">
              <span className="font-bold text-white text-xl" style={{ fontFamily: 'serif' }}>A</span>
            </div>
            <div>
              <span className="font-bold text-white text-xl tracking-wide">AHA</span>
              <span className="text-white/70 text-sm ml-1.5">Social</span>
            </div>
          </div>

          {/* Conteúdo principal */}
          <div className="flex-1 flex flex-col justify-center mt-12">
            <div className="text-6xl mb-8">🚀</div>
            <h1 className="font-bold text-white text-4xl leading-tight mb-4">
              Planeje, aprove e publique
              <span className="block text-white/80">com inteligência!</span>
            </h1>
            <p className="text-white/80 text-lg mb-10 max-w-md leading-relaxed">
              A plataforma completa para agências que gerenciam redes sociais
            </p>

            <div className="flex flex-wrap gap-3">
              {FEATURES.map((f) => (
                <div
                  key={f}
                  className="px-4 py-2 rounded-full bg-white/20 backdrop-blur text-white text-sm font-medium border border-white/30"
                >
                  {f}
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/40 text-xs mt-8 uppercase tracking-wider">
            Todos os direitos reservados AHA Publicita Company
          </p>
        </div>
      </div>

      {/* ── Painel direito ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 py-12 bg-white">
        <div className="w-full max-w-sm mx-auto">

          {/* Logo mobile */}
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #FF5C00, #FF8C00)' }}
            >
              <span className="font-bold text-white">A</span>
            </div>
            <div>
              <div className="font-bold text-[#FF5C00] text-lg leading-none">AHA</div>
              <div className="text-[10px] text-gray-400 tracking-widest uppercase">Social Planning</div>
            </div>
          </div>

          {/* Logo desktop */}
          <div className="hidden lg:block mb-8">
            <div className="font-bold text-[#FF5C00] text-2xl tracking-wide">AHA SOCIAL PLANNING</div>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-1">Bem-vindo de volta 👋</h2>
          <p className="text-sm text-gray-500 mb-8">
            Entre na sua conta para gerenciar seus conteúdos.
          </p>

          {/* Erro global */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {resetMode ? (
            /* ── Recuperar senha ── */
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {resetSent
                  ? '✅ E-mail enviado! Verifique sua caixa de entrada.'
                  : 'Informe seu e-mail para receber as instruções de recuperação.'}
              </p>
              {!resetSent && (
                <>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]"
                  />
                  <button
                    onClick={handleReset}
                    className="w-full py-3 text-white text-sm font-medium rounded-lg transition-colors"
                    style={{ background: 'linear-gradient(135deg, #FF5C00, #FF8C00)' }}
                  >
                    Enviar e-mail de recuperação
                  </button>
                </>
              )}
              <button
                onClick={() => { setResetMode(false); setResetSent(false); clearError(); }}
                className="text-sm text-[#FF5C00] hover:underline"
              >
                ← Voltar para o login
              </button>
            </div>
          ) : (
            /* ── Formulário de login ── */
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {/* E-mail */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  E-MAIL
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">✉️</span>
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    {...register('email')}
                    className={cn(
                      'w-full pl-10 pr-4 py-3 text-sm border rounded-lg transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]',
                      errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200'
                    )}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Senha */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    SENHA
                  </label>
                  <button
                    type="button"
                    onClick={() => setResetMode(true)}
                    className="text-xs text-[#FF5C00] hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    className={cn(
                      'w-full pl-10 pr-10 py-3 text-sm border rounded-lg transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]',
                      errors.password ? 'border-red-400 bg-red-50' : 'border-gray-200'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  >
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>

              {/* Botão entrar */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-200/50"
                style={{ background: 'linear-gradient(135deg, #FF5C00, #FF8C00)' }}
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar na plataforma →'
                )}
              </button>

              {/* Separador */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">ou</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Botão Google */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoad}
                className="w-full py-3 border border-gray-200 hover:bg-gray-50 disabled:opacity-60 text-gray-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
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

              {/* Link para cadastro — NOVO */}
              <div className="text-center pt-2 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Não tem conta?{' '}
                  <a
                    href="/register"
                    className="text-[#FF5C00] font-semibold hover:underline"
                  >
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
