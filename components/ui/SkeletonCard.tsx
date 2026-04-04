'use client';

import { cn } from '@/lib/utils/cn';

function Bone({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-4 shadow-card space-y-3">
      <Bone className="h-36 w-full rounded-lg" />
      <Bone className="h-4 w-3/4" />
      <Bone className="h-3 w-1/2" />
      <div className="flex gap-2">
        <Bone className="h-6 w-16 rounded-full" />
        <Bone className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-3 border-b border-gray-100">
      <Bone className="h-10 w-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Bone className="h-3.5 w-48" />
        <Bone className="h-3 w-32" />
      </div>
      <Bone className="h-6 w-20 rounded-full" />
      <Bone className="h-3 w-24" />
    </div>
  );
}

export function SkeletonKpiCard() {
  return (
    <div className="bg-white rounded-xl p-5 shadow-card space-y-3">
      <div className="flex justify-between">
        <Bone className="h-4 w-28" />
        <Bone className="h-8 w-8 rounded-lg" />
      </div>
      <Bone className="h-8 w-20" />
      <Bone className="h-3 w-32" />
    </div>
  );
}

export function SkeletonKanbanCard() {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-card">
      <Bone className="h-32 w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Bone className="h-3.5 w-4/5" />
        <Bone className="h-3 w-1/2" />
        <div className="flex justify-end gap-1 pt-1">
          <Bone className="h-7 w-7 rounded-lg" />
          <Bone className="h-7 w-7 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonKpiRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonKpiCard key={i} />
      ))}
    </div>
  );
}
