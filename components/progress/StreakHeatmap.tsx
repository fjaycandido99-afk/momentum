'use client'

interface StreakHeatmapProps {
  heatmap: Record<string, number>
  daysLimit: number
}

export function StreakHeatmap({ heatmap, daysLimit }: StreakHeatmapProps) {
  const weeks = Math.min(Math.ceil(daysLimit / 7), 52)
  const today = new Date()

  // Generate grid: 7 rows (days) x N columns (weeks)
  const cells: { date: string; count: number }[] = []
  for (let w = weeks - 1; w >= 0; w--) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(today)
      date.setDate(today.getDate() - (w * 7 + (6 - d)))
      const dateStr = date.toISOString().split('T')[0]
      cells.push({ date: dateStr, count: heatmap[dateStr] || 0 })
    }
  }

  const getOpacity = (count: number) => {
    if (count === 0) return 0.05
    if (count === 1) return 0.25
    if (count <= 3) return 0.5
    return 0.8
  }

  return (
    <div className="glass-refined rounded-2xl p-4">
      <h3 className="text-sm font-medium text-white mb-3">Activity</h3>
      <div className="overflow-x-auto scrollbar-hide">
        <div
          className="grid gap-[2px]"
          style={{
            gridTemplateRows: 'repeat(7, 1fr)',
            gridTemplateColumns: `repeat(${weeks}, 1fr)`,
            gridAutoFlow: 'column',
            width: `${weeks * 14}px`,
          }}
        >
          {cells.map((cell, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-[2px]"
              style={{ backgroundColor: `rgba(255, 255, 255, ${getOpacity(cell.count)})` }}
              title={`${cell.date}: ${cell.count} activities`}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 text-[10px] text-white/40">
        <span>Less</span>
        {[0.05, 0.25, 0.5, 0.8].map((op, i) => (
          <div key={i} className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: `rgba(255, 255, 255, ${op})` }} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
