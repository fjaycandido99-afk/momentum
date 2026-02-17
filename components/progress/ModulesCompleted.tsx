'use client'

import { CheckCircle } from 'lucide-react'

interface ModulesCompletedProps {
  count: number
  activeDays: number
}

export function ModulesCompleted({ count, activeDays }: ModulesCompletedProps) {
  return (
    <div className="glass-refined rounded-2xl p-4">
      <h3 className="text-sm font-medium text-white mb-3">Modules Completed</h3>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="text-2xl font-bold text-white">{count}</p>
            <p className="text-[10px] text-white/60">modules</p>
          </div>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div>
          <p className="text-2xl font-bold text-white">{activeDays}</p>
          <p className="text-[10px] text-white/60">active days</p>
        </div>
      </div>
    </div>
  )
}
