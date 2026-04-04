'use client';

import { useState }        from 'react';
import { cn }              from '@/lib/utils/cn';
import { StatusBadge }     from '@/components/ui/Badge';
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

export function AgendamentoCalendario({ posts, onSelect }: AgendamentoCalendarioProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart  = startOfMonth(currentMonth);
  const monthEnd    = endOfMonth(currentMonth);
  const calStart    = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd      = endOfWeek(monthEnd,     { weekStartsOn: 0 });
  const days        = eachDayOfInterval({ start: calStart, end: calEnd });

  const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const postsOnDay = (day: Date): Post[] =>
    posts.filter((p) => {
      if (!p.scheduledAt) return false;
      const d = p.scheduledAt instanceof Timestamp
        ? p.scheduledAt.toDate()
        : new Date(p.scheduledAt as unknown as string);
      return isSameDay(d, day);
    });

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <button
          onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
        >
          ‹
        </button>
        <h3 className="text-sm font-semibold text-gray-900 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <button
          onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
        >
          ›
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center py-2 text-xs font-semibold text-gray-400 uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayPosts    = postsOnDay(day);
          const inMonth     = isSameMonth(day, currentMonth);
          const today       = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'min-h-[90px] p-1.5 border-b border-r border-gray-50 transition-colors',
                !inMonth && 'bg-gray-50/60',
                today && 'bg-orange-50'
              )}
            >
              {/* Day number */}
              <div className={cn(
                'w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1',
                today ? 'bg-[#FF5C00] text-white' : inMonth ? 'text-gray-700' : 'text-gray-300'
              )}>
                {format(day, 'd')}
              </div>

              {/* Posts */}
              <div className="space-y-0.5 overflow-hidden">
                {dayPosts.slice(0, 3).map((post) => (
                  <button
                    key={post.id}
                    onClick={() => onSelect(post)}
                    className="w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#FF5C00]/10 text-[#FF5C00] hover:bg-[#FF5C00]/20 transition-colors truncate"
                  >
                    {post.title}
                  </button>
                ))}
                {dayPosts.length > 3 && (
                  <p className="text-[10px] text-gray-400 pl-1">+{dayPosts.length - 3} mais</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
