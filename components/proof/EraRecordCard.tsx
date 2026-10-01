import type { EraRecord } from '@/lib/era/record'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Sep 1" from YYYY-MM-DD, without going through a Date (no timezone slide). */
function short(day: string): string {
  return `${MONTHS[Number(day.slice(5, 7)) - 1] ?? ''} ${Number(day.slice(8, 10))}`
}

/**
 * One finished era, kept for good. Only figures the record can carry: no
 * percentages, and a strongest week only when lib/era/record says it's real.
 */
export function EraRecordCard({ record }: { record: EraRecord }) {
  const rows: [string, string][] = []
  if (record.answered > 0) rows.push(['Promises kept', `${record.kept} of ${record.answered}`])
  if (record.longestRun > 1) rows.push(['Longest run', `${record.longestRun} days`])
  if (record.recoveries > 0) rows.push(['Came back after a miss', `${record.recoveries} ${record.recoveries === 1 ? 'time' : 'times'}`])
  if (record.strongestWeek) {
    rows.push(['Strongest week', `Week ${record.strongestWeek.week} · ${record.strongestWeek.kept} of ${record.strongestWeek.answered}`])
  }

  return (
    <div className="rounded-2xl border border-white/[0.12] bg-white/[0.03] p-4">
      <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">
        {record.completed ? 'Complete' : `Stopped on day ${record.daysRun}`} · {short(record.startDay)} – {short(record.endDay)}
      </p>
      <p className="text-[22px] text-white leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>{record.title}</p>

      {rows.length > 0 && (
        <dl className="mt-3 space-y-1.5">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3">
              <dt className="text-[12px] text-white/55">{label}</dt>
              <dd className="text-[13px] text-white tabular-nums text-right">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {record.stayed.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/45">What stayed</p>
          {record.stayed.map(label => (
            <p key={label} className="text-[14px] text-white/90 mt-0.5">{label}</p>
          ))}
        </div>
      )}

      {record.reflection && (
        <p className="text-[17px] text-white/90 leading-snug mt-3" style={SERIF}>&ldquo;{record.reflection}&rdquo;</p>
      )}
    </div>
  )
}
