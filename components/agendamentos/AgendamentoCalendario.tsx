'use client';

/**
 * AgendamentoCalendario.tsx
 * 
 * Melhoria: passa view="calendario" para AgendamentoCard,
 * que agora exibe miniatura compacta com lightbox ao clicar.
 */

import { useState }        from 'react';
import { cn }              from '@/lib/utils/cn';
import { AgendamentoCard } from './AgendamentoCard';
import type { Post, Responsavel } from '@/lib/types';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday,
} from 'date-fns';
import { ptBR }      from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

interface AgendamentoCalendarioProps {
  posts:       Post[];
  uid:         string;
  responsavel: Responsavel;
  onSelect:    (post: Post) => void;
}

const STATUS_DOT: Record<string, string> = {
  rascunho:          'bg-gray-400',
  conteudo:          'bg-blue-400',
  revisao:           'bg-yellow-400',
  aprovacao_cliente: 'bg-purple-400',
  em_analise:        'bg-indigo-400',
  aprovado:          'bg-green-500',
  rejeitado:         'bg-red-500',
  publicado:         'bg-emerald-500',
};

export function AgendamentoCalendario({
  posts, uid, responsavel, onSelect,
}: AgendamentoCalendarioProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(currentMonth);
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 0 });
  const days       = eachDayOfInterval({ start: calStart, end: calEnd });

  const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const postsOnDay = (day: Date): Post[] =>
    posts.filter((p) => {
      if (!p.scheduledAt) return false;
      const d = p.scheduledAt instanceof Timestamp
        ? p.scheduledAt.toDate()
        : new Date(p.scheduledAt as unknown as string);
      return isSameDay(d, day);
    });

  const totalThisMonth = posts.filter((p) => {
    if (!p.scheduledAt) return false;
    const d = p.scheduledAt instanceof Timestamp
      ? p.scheduledAt.toDate()
      : new Date(p.scheduledAt as unknown as string);
    return isSameMonth(d, currentMonth);
  }).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header de navegação */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <button
          onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors text-gray-500 text-xl"
        >
          ‹
        </button>
        <div className="text-center">
          <h3 className="text-[15px] font-bold text-gray-900 capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h3>
          <p className="text-[11px] text-gray-400">{totalThisMonth} posts agendados</p>
        </div>
        <button
          onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors text-gray-500 text-xl"
        >
          ›
        </button>
      </div>

      {/* Grade do calendário */}
      <div className="p-4">
        {/* Cabeçalho dos dias */}
        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Células dos dias */}
        <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-xl overflow-hidden border border-gray-100">
          {days.map((day) => {
            const dayPosts   = postsOnDay(day);
            const inMonth    = isSameMonth(day, currentMonth);
            const isTodayDay = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'bg-white min-h-[90px] p-1.5',
                  !inMonth && 'bg-gray-50/60',
                )}
              >
                {/* Número do dia */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      'w-6 h-6 flex items-center justify-center text-[12px] font-semibold rounded-full',
                      isTodayDay
                        ? 'bg-[#FF5C00] text-white'
                        : inMonth
                          ? 'text-gray-700'
                          : 'text-gray-300',
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayPosts.length > 0 && (
                    <span className="text-[9px] text-gray-400 font-medium">{dayPosts.length}p</span>
                  )}
                </div>

                {/* Posts do dia — modo calendário (compacto com miniatura) */}
                <div className="space-y-0.5">
                  {dayPosts.slice(0, 3).map((post) => (
                    <AgendamentoCard
                      key={post.id}
                      post={post}
                      uid={uid}
                      responsavel={responsavel}
                      view="calendario"
                      onEdit={onSelect}
                    />
                  ))}
                  {dayPosts.length > 3 && (
                    <div className="text-[9px] text-gray-400 text-center py-0.5">
                      +{dayPosts.length - 3} mais
                    </div>
                  )}
                </div>

                {/* Dots de status (alternativa visual) */}
                {dayPosts.length === 0 && inMonth && (
                  <div className="h-full" /> /* célula vazia */
                )}
              </div>
            );
          })}
        </div>

        {/* Legenda de status */}
        <div className="mt-4 flex flex-wrap gap-3 pt-3 border-t border-gray-50">
          {Object.entries(STATUS_DOT).map(([key, cls]) => (
            <div key={key} className="flex items-center gap-1">
              <span className={cn('w-2 h-2 rounded-full', cls)} />
              <span className="text-[10px] text-gray-400 capitalize">
                {key.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
