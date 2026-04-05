'use client';

import { useState }        from 'react';
import { cn }              from '@/lib/utils/cn';
import type { Post }       from '@/lib/types';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

interface AgendamentoCalendarioProps {
  posts:    Post[];
  onSelect: (post: Post) => void;
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

const STATUS_PILL: Record<string, string> = {
  rascunho:          'bg-gray-100 text-gray-600',
  conteudo:          'bg-blue-100 text-blue-600',
  revisao:           'bg-yellow-100 text-yellow-700',
  aprovacao_cliente: 'bg-purple-100 text-purple-600',
  em_analise:        'bg-indigo-100 text-indigo-700',
  aprovado:          'bg-green-100 text-green-700',
  rejeitado:         'bg-red-100 text-red-600',
  publicado:         'bg-emerald-100 text-emerald-700',
};

export function AgendamentoCalendario({ posts, onSelect }: AgendamentoCalendarioProps) {
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
    const d = p.scheduledAt instanceof Timestamp ? p.scheduledAt.toDate() : new Date(p.scheduledAt as unknown as string);
    return isSameMonth(d, currentMonth);
  }).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <button
          onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors text-gray-500 text-xl"
        >‹</button>
        <div className="text-center">
          <h3 className="text-[15px] font-bold text-gray-900 capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h3>
          <p className="text-[11px] text-gray-400">{totalThisMonth} posts agendados</p>
        </div>
        <button
          onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors text-gray-500 text-xl"
        >›</button>
      </div>

      <div className="grid grid-cols-7 bg-gray-50/60 border-b border-gray-100">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center py-2.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayPosts = postsOnDay(day);
          const inMonth  = isSameMonth(day, currentMonth);
          const today    = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'min-h-[100px] p-1.5 border-b border-r border-gray-50 transition-colors',
                !inMonth && 'bg-gray-50/40',
                today && 'bg-[#FF5C00]/5'
              )}
            >
              <div className={cn(
                'w-7 h-7 flex items-center justify-center rounded-full text-[12px] font-semibold mb-1',
                today  ? 'bg-[#FF5C00] text-white shadow-sm' : inMonth ? 'text-gray-700' : 'text-gray-300'
              )}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {dayPosts.slice(0, 2).map((post) => {
                  const thumbnail = post.creatives?.[0]?.url;
                  return (
                    <button
                      key={post.id}
                      onClick={() => onSelect(post)}
                      className={cn(
                        'w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors',
                        STATUS_PILL[post.status] ?? 'bg-gray-100 text-gray-600',
                        'hover:opacity-80'
                      )}
                      title={post.title}
                    >
                      {thumbnail && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbnail} alt="" className="w-3 h-3 rounded object-cover shrink-0" />
                      )}
                      {!thumbnail && (
                        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[post.status] ?? 'bg-gray-400')} />
                      )}
                      <span className="truncate">{post.title}</span>
                    </button>
                  );
                })}
                {dayPosts.length > 2 && (
                  <p className="text-[10px] text-gray-400 pl-1 font-medium">+{dayPosts.length - 2} mais</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 flex-wrap px-5 py-3 border-t border-gray-100 bg-gray-50/40">
        {[
          { label: 'Rascunho', color: 'bg-gray-400' },
          { label: 'Revisão',  color: 'bg-yellow-400' },
          { label: 'Aprovado', color: 'bg-green-500' },
          { label: 'Publicado',color: 'bg-emerald-500' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <span className={cn('w-2 h-2 rounded-full', color)} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
