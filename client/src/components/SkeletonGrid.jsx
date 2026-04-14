import React from 'react';

export function SkeletonCard({ delay = 0 }) {
  return (
    <div 
      className="bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden shadow-sm animate-in fade-in duration-700"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="h-48 w-full bg-gray-100 animate-pulse" />
      <div className="p-5 flex flex-col flex-1 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-16 h-3 bg-gray-100 rounded animate-pulse" />
          <div className="w-20 h-3 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="w-3/4 h-5 bg-gray-100 rounded animate-pulse" />
        <div className="space-y-2">
          <div className="w-full h-3 bg-gray-50 rounded animate-pulse" />
          <div className="w-5/6 h-3 bg-gray-50 rounded animate-pulse" />
        </div>
        <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center">
          <div className="flex gap-4">
            <div className="w-12 h-6 bg-gray-100 rounded-full animate-pulse" />
            <div className="w-12 h-6 bg-gray-100 rounded-full animate-pulse" />
          </div>
          <div className="w-8 h-3 bg-gray-50 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="w-full animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <div className="w-48 h-8 bg-gray-100 rounded-xl animate-pulse" />
            <div className="flex gap-2">
                <div className="w-24 h-8 bg-gray-100 rounded-xl animate-pulse" />
                <div className="w-20 h-8 bg-gray-100 rounded-xl animate-pulse" />
            </div>
        </div>
        <div className="divide-y divide-gray-100">
            {[...Array(rows)].map((_, i) => (
                <div key={i} className="px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="w-16 h-4 bg-gray-100 rounded animate-pulse" />
                        <div className="flex-1 max-w-sm">
                            <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse mb-2" />
                            <div className="w-1/3 h-3 bg-gray-100 rounded animate-pulse" />
                        </div>
                    </div>
                    <div className="w-24 h-4 bg-gray-100 rounded animate-pulse" />
                    <div className="w-20 h-6 bg-gray-100 rounded-full animate-pulse mx-8" />
                    <div className="w-24 h-4 bg-gray-100 rounded animate-pulse" />
                    <div className="w-20 h-8 bg-gray-50 rounded-lg animate-pulse ml-8" />
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default function SkeletonGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {[...Array(count)].map((_, i) => (
        <SkeletonCard key={i} delay={i * 100} />
      ))}
    </div>
  );
}
