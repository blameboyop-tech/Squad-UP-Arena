import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'card' | 'list-item' | 'tournament' | 'shop' | 'profile' | 'circle' | 'text';
  count?: number;
}

export default function SkeletonLoader({ className = '', variant = 'card', count = 3 }: SkeletonProps) {
  const renderSkeleton = (index: number) => {
    switch (variant) {
      case 'circle':
        return (
          <div
            key={index}
            className={`animate-pulse rounded-full bg-white/10 shrink-0 ${className}`}
          />
        );
      case 'text':
        return (
          <div
            key={index}
            className={`animate-pulse h-4 rounded bg-white/10 ${className}`}
          />
        );
      case 'list-item':
        return (
          <div
            key={index}
            className="flex items-center gap-3 p-3 rounded-2xl border border-white/5 bg-white/[0.01] animate-pulse"
          >
            <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-white/10 rounded w-1/3" />
              <div className="h-2.5 bg-white/5 rounded w-1/2" />
            </div>
            <div className="w-12 h-6 rounded-lg bg-white/5" />
          </div>
        );
      case 'tournament':
        return (
          <div
            key={index}
            className="bg-[#16173a] border border-white/5 rounded-[32px] overflow-hidden p-4 space-y-4 animate-pulse"
          >
            <div className="h-40 bg-white/10 rounded-2xl w-full" />
            <div className="space-y-3 px-2">
              <div className="h-5 bg-white/10 rounded w-2/3" />
              <div className="flex gap-2">
                <div className="h-4 bg-white/5 rounded-full w-20" />
                <div className="h-4 bg-white/5 rounded-full w-16" />
              </div>
              <div className="flex justify-between items-center pt-2">
                <div className="h-6 bg-white/10 rounded w-24" />
                <div className="h-8 bg-white/10 rounded-full w-28" />
              </div>
            </div>
          </div>
        );
      case 'shop':
        return (
          <div
            key={index}
            className="bg-white/[0.02] border border-white/5 rounded-[32px] p-4 flex flex-col justify-between h-[340px] animate-pulse"
          >
            <div className="h-40 bg-white/10 rounded-2xl w-full mb-4" />
            <div className="space-y-3 flex-1">
              <div className="h-4.5 bg-white/10 rounded w-3/4" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
              <div className="h-6 bg-white/5 rounded w-20 mt-2" />
            </div>
            <div className="h-10 bg-white/10 rounded-2xl w-full mt-4" />
          </div>
        );
      case 'profile':
        return (
          <div className="w-full space-y-6 p-6 bg-white/[0.01] border border-white/5 rounded-[32px] animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/10" />
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-white/10 rounded w-1/3" />
                <div className="h-3 bg-white/5 rounded w-1/4" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="h-20 bg-white/10 rounded-2xl" />
              <div className="h-20 bg-white/10 rounded-2xl" />
              <div className="h-20 bg-white/10 rounded-2xl" />
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-white/10 rounded w-1/4" />
              <div className="h-3.5 bg-white/5 rounded w-full" />
              <div className="h-3.5 bg-white/5 rounded w-5/6" />
            </div>
          </div>
        );
      case 'card':
      default:
        return (
          <div
            key={index}
            className="p-5 rounded-3xl border border-white/5 bg-white/[0.01] flex flex-col gap-4 animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded w-1/2" />
                <div className="h-2.5 bg-white/5 rounded w-1/3" />
              </div>
            </div>
            <div className="h-12 bg-white/5 rounded-2xl w-full" />
            <div className="flex gap-2">
              <div className="h-5 bg-white/5 rounded-full w-16" />
              <div className="h-5 bg-white/5 rounded-full w-16" />
              <div className="h-5 bg-white/5 rounded-full w-16" />
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`grid grid-cols-1 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, idx) => renderSkeleton(idx))}
    </div>
  );
}
