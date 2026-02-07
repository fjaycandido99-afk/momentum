'use client'

interface ListeningStatsProps {
  totalMinutes: number
  categoryMinutes: Record<string, number>
}

const CATEGORY_LABELS: Record<string, string> = {
  workout: 'Workout',
  morning: 'Morning',
  commute: 'Commute',
  evening: 'Evening',
  other: 'Other',
}

const CATEGORY_COLORS: Record<string, string> = {
  workout: 'bg-amber-400',
  morning: 'bg-cyan-400',
  commute: 'bg-violet-400',
  evening: 'bg-indigo-400',
  other: 'bg-white/50',
}

export function ListeningStats({ totalMinutes, categoryMinutes }: ListeningStatsProps) {
  const max = Math.max(...Object.values(categoryMinutes), 1)
  const entries = Object.entries(categoryMinutes).sort((a, b) => b[1] - a[1])

  return (
    <div className="glass-refined rounded-2xl p-4">
      <h3 className="text-sm font-medium text-white mb-1">Listening Time</h3>
      <p className="text-2xl font-bold text-white mb-4">{totalMinutes} <span className="text-sm font-normal text-white/50">min</span></p>
      <div className="space-y-2">
        {entries.map(([type, minutes]) => (
          <div key={type} className="flex items-center gap-2">
            <span className="text-xs text-white/60 w-16 shrink-0">{CATEGORY_LABELS[type] || type}</span>
            <div className="flex-1 h-2 rounded-full bg-white/5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${CATEGORY_COLORS[type] || 'bg-white/50'}`}
                style={{ width: `${(minutes / max) * 100}%` }}
              />
            </div>
            <span className="text-xs text-white/40 w-8 text-right">{minutes}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
