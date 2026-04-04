'use client';

interface FunnelStep {
  label:      string;
  value:      number;
  icon:       string;
}

const STEPS: FunnelStep[] = [
  { label: 'Criados',    icon: '✏️', value: 0 },
  { label: 'Enviados',   icon: '📤', value: 0 },
  { label: 'Revisão',    icon: '🔍', value: 0 },
  { label: 'Aprovados',  icon: '✅', value: 0 },
  { label: 'Publicados', icon: '🚀', value: 0 },
];

interface ContentFunnelProps {
  data: Partial<Record<string, number>>;
}

export function ContentFunnel({ data }: ContentFunnelProps) {
  const steps: FunnelStep[] = [
    { label: 'Criados',    icon: '✏️', value: data['criados']    ?? 0 },
    { label: 'Enviados',   icon: '📤', value: data['enviados']   ?? 0 },
    { label: 'Revisão',    icon: '🔍', value: data['revisao']    ?? 0 },
    { label: 'Aprovados',  icon: '✅', value: data['aprovados']  ?? 0 },
    { label: 'Publicados', icon: '🚀', value: data['publicados'] ?? 0 },
  ];

  const total = steps[0]?.value ?? 1;

  return (
    <div className="bg-white rounded-xl p-6 shadow-card">
      <h3 className="text-sm font-semibold text-gray-800 mb-1">Funil de Conteúdo</h3>
      <p className="text-xs text-gray-500 mb-5">Taxa de conversão entre etapas</p>

      <div className="flex items-center gap-0 overflow-x-auto pb-2">
        {steps.map((step, i) => {
          const pct = total > 0 ? Math.round((step.value / total) * 100) : 0;
          const isFirst = i === 0;
          const convPct = i > 0 && (steps[i - 1]?.value ?? 0) > 0
            ? Math.round((step.value / (steps[i - 1]?.value ?? 1)) * 100)
            : null;

          return (
            <div key={step.label} className="flex items-center shrink-0">
              {/* Arrow connector */}
              {!isFirst && (
                <div className="flex flex-col items-center mx-1">
                  <span className="text-gray-300 text-lg">›</span>
                  {convPct !== null && (
                    <span className="text-[10px] text-gray-400 -mt-1">{convPct}%</span>
                  )}
                </div>
              )}

              {/* Step card */}
              <div className="flex flex-col items-center min-w-[80px]">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-2 transition-transform hover:scale-110"
                  style={{ background: `rgba(255,92,0,${0.1 + (pct / 100) * 0.25})` }}
                >
                  {step.icon}
                </div>
                <p className="text-lg font-bold text-gray-900">{step.value}</p>
                <p className="text-[11px] text-gray-500 text-center">{step.label}</p>
                <div className="w-full mt-2 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#FF5C00] transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">{pct}%</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
