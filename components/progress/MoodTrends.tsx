'use client'

interface MoodDataPoint {
  date: string
  before: number | null
  after: number | null
}

interface MoodTrendsProps {
  moodData: MoodDataPoint[]
}

export function MoodTrends({ moodData }: MoodTrendsProps) {
  if (moodData.length === 0) {
    return (
      <div className="glass-refined rounded-2xl p-4">
        <h3 className="text-sm font-medium text-white mb-3">Mood Trends</h3>
        <p className="text-xs text-white/60 py-6 text-center">No mood data yet. Log your mood in the Daily Guide.</p>
      </div>
    )
  }

  const chartW = 300
  const chartH = 100
  const padding = 20

  const maxPoints = Math.min(moodData.length, 30)
  const data = moodData.slice(-maxPoints)

  const xStep = data.length > 1 ? (chartW - padding * 2) / (data.length - 1) : 0
  const yScale = (v: number) => chartH - padding - ((v - 1) / 2) * (chartH - padding * 2)

  const buildPath = (key: 'before' | 'after') => {
    const points = data
      .map((d, i) => ({ x: padding + i * xStep, y: d[key] != null ? yScale(d[key]!) : null }))
      .filter(p => p.y != null)

    if (points.length < 2) return ''
    return 'M' + points.map(p => `${p.x},${p.y}`).join(' L')
  }

  return (
    <div className="glass-refined rounded-2xl p-4">
      <h3 className="text-sm font-medium text-white mb-3">Mood Trends</h3>
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ maxHeight: 120 }}>
        {/* Grid lines */}
        {[1, 2, 3].map(v => (
          <line key={v} x1={padding} x2={chartW - padding} y1={yScale(v)} y2={yScale(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        ))}

        {/* Before line (blue) */}
        {buildPath('before') && (
          <path d={buildPath('before')} fill="none" stroke="rgba(96,165,250,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* After line (green) */}
        {buildPath('after') && (
          <path d={buildPath('after')} fill="none" stroke="rgba(74,222,128,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Y-axis labels */}
        <text x={padding - 4} y={yScale(3)} fill="rgba(255,255,255,0.3)" fontSize="8" textAnchor="end" dominantBaseline="middle">High</text>
        <text x={padding - 4} y={yScale(2)} fill="rgba(255,255,255,0.3)" fontSize="8" textAnchor="end" dominantBaseline="middle">Med</text>
        <text x={padding - 4} y={yScale(1)} fill="rgba(255,255,255,0.3)" fontSize="8" textAnchor="end" dominantBaseline="middle">Low</text>
      </svg>
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-0.5 rounded-full bg-blue-400" />
          <span className="text-[10px] text-white/60">Before</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-0.5 rounded-full bg-green-400" />
          <span className="text-[10px] text-white/60">After</span>
        </div>
      </div>
    </div>
  )
}
