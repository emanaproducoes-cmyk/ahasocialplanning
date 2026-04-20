'use client';

import { useState, useEffect } from 'react';
import { useRouter }           from 'next/navigation';
import { useForm }             from 'react-hook-form';
import { zodResolver }         from '@hookform/resolvers/zod';
import { z }                   from 'zod';
import { useAuth }             from '@/lib/hooks/useAuth';
import { cn }                  from '@/lib/utils/cn';
import { showToast }           from '@/components/ui/Toast';

// ─── Validation ─────────────────────────────────────────────────────────────
const registerSchema = z.object({
  name:     z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(80, 'Nome muito longo'),
  email:    z.string().email('E-mail inválido'),
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
  confirmPassword: z.string(),
  terms: z.literal(true, {
    errorMap: () => ({ message: 'Você deve aceitar os termos de uso' }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

const BENEFITS = [
  { icon: '📅', label: 'Agendamento multi-plataforma' },
  { icon: '✅', label: 'Aprovação com link direto' },
  { icon: '📊', label: 'Dashboard em tempo real' },
  { icon: '🚀', label: 'Gestão de Campanhas' },
  { icon: '💰', label: 'Análise de Tráfego Pago' },
  { icon: '🎨', label: 'Criativos organizados' },
];

export default function RegisterPage() {
  const router = useRouter();
  const {
    user,
    loading,
    registerWithEmail,
    loginWithGoogle,
    error,
    clearError,
  } = useAuth();

  const [showPass,        setShowPass]        = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [googleLoad,      setGoogleLoad]      = useState(false);
  const [step,            setStep]            = useState<'form' | 'success'>('form');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { terms: false as unknown as true },
  });

  const passwordValue = watch('password', '');

  // Força do password
  const passwordStrength = (() => {
    if (!passwordValue) return 0;
    let score = 0;
    if (passwordValue.length >= 8)  score++;
    if (passwordValue.length >= 12) score++;
    if (/[A-Z]/.test(passwordValue)) score++;
    if (/[0-9]/.test(passwordValue)) score++;
    if (/[^A-Za-z0-9]/.test(passwordValue)) score++;
    return score;
  })();

  const strengthLabel = ['', 'Fraca', 'Razoável', 'Boa', 'Forte', 'Excelente'][passwordStrength];
  const strengthColor = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400', 'bg-emerald-500'][passwordStrength];

  // Redireciona se já estiver logado
  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [loading, user, router]);

  const onSubmit = async (data: RegisterForm) => {
    clearError();
    try {
      await registerWithEmail(data.name, data.email, data.password);
      setStep('success');
      showToast('Conta criada com sucesso! Bem-vindo ao AHA Social 🎉', 'success');
      setTimeout(() => router.replace('/dashboard'), 2000);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F7FF]">
        <div className="w-10 h-10 border-[3px] border-orange-200 border-t-[#FF5C00] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Painel esquerdo (hero) ───────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[55%] flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #FF5C00 0%, #FF8C00 55%, #FFB800 100%)' }}
      >
        {/* Círculos decorativos */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/10 rounded-full" />
        <div className="absolute -bottom-28 -right-28 w-88 h-88 bg-white/10 rounded-full" />
        <div className="absolute top-1/2 -right-10 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute bottom-1/4 left-10 w-24 h-24 bg-white/5 rounded-full" />

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

          {/* Conteúdo central */}
          <div className="flex-1 flex flex-col justify-center mt-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full mb-6 w-fit">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white text-xs font-medium">Plataforma All-in-One</span>
            </div>

            <h1 className="font-bold text-white text-4xl leading-tight mb-5">
              Gerencie todas as
              <span className="block text-white/90">redes sociais dos</span>
              <span className="block">seus clientes</span>
            </h1>

            <p className="text-white/80 text-base mb-10 max-w-md leading-relaxed">
              Em 40 segundos você aprende a planejar, aprovar e publicar conteúdos com inteligência. Junte-se a agências que já usam o AHA Social.
            </p>

            {/* Grid de benefícios */}
            <div className="grid grid-cols-2 gap-3">
              {BENEFITS.map((b) => (
                <div
                  key={b.label}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/15 backdrop-blur border border-white/20"
                >
                  <span className="text-lg">{b.icon}</span>
                  <span className="text-white text-xs font-medium leading-tight">{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/40 text-xs mt-8 uppercase tracking-wider">
            © AHA Publicita Company · Todos os direitos reservados
          </p>
        </div>
      </div>

      {/* ── Painel direito (form) ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-14 py-10 bg-white overflow-y-auto">
        <div className="w-full max-w-md mx-auto">

          {/* Logo mobile */}
          <div className="lg:hidden mb-7 flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF5C00, #FF8C00)' }}>
              <span className="font-bold text-white text-base">A</span>
            </div>
            <div>
              <div className="font-bold text-[#FF5C00] text-lg leading-none">AHA SOCIAL</div>
              <div className="text-[10px] text-gray-400 tracking-widest uppercase">Planning</div>
            </div>
          </div>

          {step === 'success' ? (
            /* ── Tela de sucesso ── */
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                <span className="text-4xl">✅</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Conta criada!</h2>
              <p className="text-gray-500 text-sm mb-2">Bem-vindo ao AHA Social. Enviamos um e-mail de verificação.</p>
              <p className="text-gray-400 text-xs">Redirecionando para o dashboard...</p>
              <div className="mt-6 flex justify-center">
                <div className="w-8 h-8 border-[3px] border-orange-200 border-t-[#FF5C00] rounded-full animate-spin" />
              </div>
            </div>
          ) : (
            <>
              {/* Cabeçalho */}
              <div className="hidden lg:block mb-6">
                <div className="font-bold text-[#FF5C00] text-xl tracking-wide">AHA SOCIAL PLANNING</div>
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-1">Criar sua conta 🚀</h2>
              <p className="text-sm text-gray-500 mb-6">
                Já tem conta?{' '}
                <a href="/login" className="text-[#FF5C00] font-medium hover:underline">
                  Entrar agora
                </a>
              </p>

              {/* Erro global */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                  <span className="shrink-0">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Botão Google */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoad}
                className="w-full py-3 border border-gray-200 hover:bg-gray-50 disabled:opacity-60 text-gray-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 mb-5"
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
                Cadastrar com Google
              </button>

              {/* Separador */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">ou preencha o formulário</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Formulário */}
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

                {/* Nome completo */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    NOME COMPLETO
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">👤</span>
                    <input
                      type="text"
                      placeholder="Seu nome completo"
                      {...register('name')}
                      className={cn(
                        'w-full pl-10 pr-4 py-3 text-sm border rounded-lg transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]',
                        errors.name ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      )}
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
                  )}
                </div>

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
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    SENHA
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
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
                  {/* Barra de força */}
                  {passwordValue.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={cn(
                              'h-1 flex-1 rounded-full transition-all duration-300',
                              i <= passwordStrength ? strengthColor : 'bg-gray-200'
                            )}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">
                        Força: <span className="font-medium">{strengthLabel}</span>
                      </p>
                    </div>
                  )}
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                  )}
                </div>

                {/* Confirmar senha */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    CONFIRMAR SENHA
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔐</span>
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      placeholder="Repita sua senha"
                      {...register('confirmPassword')}
                      className={cn(
                        'w-full pl-10 pr-10 py-3 text-sm border rounded-lg transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]',
                        errors.confirmPassword ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                    >
                      {showConfirmPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
                  )}
                </div>

                {/* Termos */}
                <div>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      {...register('terms')}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#FF5C00] focus:ring-[#FF5C00]/30 cursor-pointer"
                    />
                    <span className="text-sm text-gray-600 leading-relaxed">
                      Concordo com os{' '}
                      <a href="/privacidade" target="_blank" className="text-[#FF5C00] hover:underline font-medium">
                        Termos de Uso e Política de Privacidade
                      </a>{' '}
                      do AHA Social
                    </span>
                  </label>
                  {errors.terms && (
                    <p className="mt-1 text-xs text-red-600">{errors.terms.message}</p>
                  )}
                </div>

                {/* Requisitos da senha */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Requisitos da senha:</p>
                  {[
                    { label: 'Mínimo 8 caracteres', test: passwordValue.length >= 8 },
                    { label: 'Uma letra maiúscula', test: /[A-Z]/.test(passwordValue) },
                    { label: 'Um número',           test: /[0-9]/.test(passwordValue) },
                  ].map((req) => (
                    <div key={req.label} className="flex items-center gap-2">
                      <span className={cn('text-xs', req.test ? 'text-green-500' : 'text-gray-300')}>
                        {req.test ? '✓' : '○'}
                      </span>
                      <span className={cn('text-xs', req.test ? 'text-green-600' : 'text-gray-400')}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Botão criar conta */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-200/50"
                  style={{ background: 'linear-gradient(135deg, #FF5C00, #FF8C00)' }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    'Criar minha conta →'
                  )}
                </button>

                <p className="text-center text-xs text-gray-400 pt-1">
                  Já tem conta?{' '}
                  <a href="/login" className="text-[#FF5C00] hover:underline font-medium">
                    Entrar agora
                  </a>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
