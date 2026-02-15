'use client'

import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon: Icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center w-full py-10 px-8 rounded-2xl bg-black border border-white/20">
      <Icon className="w-8 h-8 text-white/30 mb-3" />
      <p className="text-sm font-medium text-white/60 text-center">{title}</p>
      {subtitle && <p className="text-xs text-white/40 mt-1 text-center">{subtitle}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 text-xs font-medium text-white/80 bg-white/10 rounded-full border border-white/15 hover:bg-white/15 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
