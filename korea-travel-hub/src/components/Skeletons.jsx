import React from 'react'

export function CardSkeleton({ lines = 2 }) {
  return (
    <div className="animate-pulse rounded-2xl bg-white p-4 ring-1 ring-slate-100 dark:bg-zinc-900/80">
      <div className="flex items-start justify-between">
        <div className="space-y-2 w-full">
          <div className="h-4 w-24 rounded-full bg-slate-100 dark:bg-zinc-800" />
          <div className="mt-2 space-y-1">
            {Array.from({ length: lines }).map((_, i) => (
              <div key={i} className="h-3 w-full rounded bg-slate-50 dark:bg-zinc-800/60" />
            ))}
          </div>
        </div>
        <div className="ml-4 h-5 w-24 rounded bg-slate-100 dark:bg-zinc-800" />
      </div>
    </div>
  )
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-4 rounded-xl bg-white p-3 dark:bg-zinc-900/80">
          <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-zinc-800" />
          <div className="flex-1 space-y-1">
            <div className="h-3 w-36 rounded bg-slate-50 dark:bg-zinc-800/60" />
            <div className="h-3 w-24 rounded bg-slate-100 dark:bg-zinc-800" />
          </div>
          <div className="h-3 w-16 rounded bg-slate-100 dark:bg-zinc-800" />
        </div>
      ))}
    </div>
  )
}

export default CardSkeleton

