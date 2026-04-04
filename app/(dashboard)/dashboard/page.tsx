'use client';

import { useState, useEffect } from 'react';
import { useAuth }             from '@/lib/hooks/useAuth';
import { useUserCollection }   from '@/lib/hooks/useCollection';
import { KpiCard }             from '@/components/dashboard/KpiCard';
import { PlatformCard }        from '@/components/dashboard/PlatformCard';
import { ContentFunnel }       from '@/components/dashboard/ContentFunnel';
import { EngagementChart, PlatformMixChart, StatusBarChart } from '@/components/dashboard/Charts';
import { SkeletonKpiRow }      from '@/components/ui/SkeletonCard';
import { PageHeader }          from '@/components/layout/PageHeader';
import { orderBy }             from 'firebase/firestore';
import type { Post, Platform } from '@/lib/types';

const PLATFORMS: { platform: Platform; metric: string }[] = [
  { platform: 'instagram', metric: 'SEGUIDORES' },
  { platform: 'facebook',  metric: 'CURTIDAS'   },
  { platform: 'youtube',   metric: 'INSCRITOS'  },
  { platform: 'tiktok',    metric: 'SEGUIDORES' },
  { platform: 'linkedin',  metric: 'CONEXÕES'   },
];

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: posts,     loading: postsLoading }    = useUserCollection<Post>(user?.uid ?? null, 'posts',     [orderBy('createdAt', 'desc')]);
  const { data: aprovados, loading: aprovLoading }    = useUserCollection<Post>(user?.uid ?? null, 'aprovados');
  const { data: emAnalise, loading: analiseLoading }  = useUserCollection<Post>(user?.uid ?? null, 'emAnalise');
  const { data: rejeitados,loading: rejLoading }      = useUserCollection<Post>(user?.uid ?? null, 'rejeitados');

  const isLoading = postsLoading || aprovLoading || analiseLoading || rejLoading;

  const kpis = [
    { label: 'Total de Posts',  value: posts.length,     variation: 18,  icon: '📋', iconBg: '#FFF3ED', borderColor: '#FF5C00' },
    { label: 'Aprovados',       value: aprovados.length, variation: 25,  icon: '✅', iconBg: '#ECFDF5', borderColor: '#22C55E' },
    { label: 'Em Análise',      value: emAnalise.length, variation: -5,  icon: '⏳', iconBg: '#FFFBEB', borderColor: '#F59E0B' },
    { label: 'Rejeitados',      value: rejeitados.length,variation: -12, icon: '❌', iconBg: '#FEF2F2', borderColor: '#EF4444' },
  ];

  const funnelData = {
    criados:    posts.length,
    enviados:   emAnalise.length + aprovados.length + rejeitados.length,
    revisao:    emAnalise.length,
    aprovados:  aprovados.length,
    publicados: posts.filter((p) => p.status === 'publicado').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral do desempenho e conteúdo"
      />

      {/* Platform cards */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Redes Sociais
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {PLATFORMS.map(({ platform, metric }) => (
            <PlatformCard
              key={platform}
              platform={platform}
              followers={Math.floor(Math.random() * 10000) + 500}
              variation={Math.round((Math.random() - 0.3) * 20)}
              metric={metric}
            />
          ))}
        </div>
      </section>

      {/* KPI cards */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Resumo de Conteúdo
        </h2>
        {isLoading ? (
          <SkeletonKpiRow count={4} />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi) => (
              <KpiCard key={kpi.label} {...kpi} />
            ))}
          </div>
        )}
      </section>

      {/* Funnel */}
      <ContentFunnel data={funnelData} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <EngagementChart />
        <PlatformMixChart />
        <StatusBarChart />

        {/* Campaigns placeholder */}
        <div className="bg-white rounded-xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Campanhas Ativas</h3>
          <p className="text-xs text-gray-500 mb-6">Linha do tempo</p>
          <div className="space-y-3">
            {['Campanha Verão', 'Lançamento Produto X', 'Black Friday'].map((name, i) => {
              const starts = [5, 12, 20];
              const widths = [60, 40, 25];
              return (
                <div key={name} className="flex items-center gap-3">
                  <p className="text-xs text-gray-600 w-36 truncate">{name}</p>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full rounded-full flex items-center px-2"
                      style={{
                        marginLeft: `${starts[i]}%`,
                        width: `${widths[i]}%`,
                        background: ['#FF5C00', '#7C3AED', '#22C55E'][i],
                      }}
                    >
                      <span className="text-[10px] text-white font-medium truncate">{name}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
