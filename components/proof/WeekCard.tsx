'use client'

import type { WeekRecap, WeekCounts } from '@/lib/proof/week'

/**
 * Your week, on Proof: the last seven days beside the seven before — counts
 * with their own denominators, never a percentage or a verdict. A row only
 * appears when either week has something in it.
 */
export function WeekCard({ recap }: { recap: WeekRecap }) {
  if (!recap.hasAnything) return null
  const t = recap.thisWeek
  const l = recap.lastWeek
  const rows: { label: string; now: string; before: string; show: boolean }[] = [
    { label: 'Promises kept', now: `${t.kept} of ${t.promised}`, before: `${l.kept} of ${l.promised}`, show: t.promised + l.promised > 0 },
    { label: 'Practices kept', now: `${t.practicesKept}`, before: `${l.practicesKept}`, show: t.practicesKept + l.practicesKept > 0 },
    { label: 'Sessions done', now: `${t.sessions}`, before: `${l.sessions}`, show: t.sessions + l.sessions > 0 },
    { label: 'Missions done', now: `${t.missions}`, before: `${l.missions}`, show: t.missions + l.missions > 0 },
    { label: 'Check-ins', now: `${t.checkIns}`, before: `${l.checkIns}`, show: t.checkIns + l.checkIns > 0 },
    // Only from their own wellness check-ins, and only when there were some.
    { label: 'Harder days', now: harder(t), before: harder(l), show: t.harderDays !== null || l.harderDays !== null },
  ]
  return (
    <div id="week" className="mt-7 card-surface rounded-2xl p-4" data-voxu-spot="proof-week">
      <div className="flex items-baseline justify-between">
        <p className="text-px-10 tracking-[0.24em] uppercase text-white/55">Your week</p>
        <p className="text-px-11 text-white/45">Last 7 days · the 7 before</p>
      </div>
      <dl className="mt-2 divide-y divide-white/[0.06]">
        {rows.filter(r => r.show).map(r => (
          <div key={r.label} className="flex items-center justify-between py-2">
            <dt className="text-px-13 text-white/75">{r.label}</dt>
            <dd className="text-px-13 tabular-nums">
              <span className="text-white">{r.now}</span>
              <span className="text-white/40"> · {r.before}</span>
            </dd>
          </div>
        ))}
      </dl>
      {t.missed > 0 && (
        <p className="text-px-11 text-white/45 mt-2">{t.missed} missed this week — they stay on the record too.</p>
      )}
    </div>
  )
}

function harder(c: WeekCounts): string {
  return c.harderDays === null ? '—' : `${c.harderDays} of ${c.checkIns}`
}
