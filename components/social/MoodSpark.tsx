/* ============================================================================
   MoodSpark — 7-bar monochrome sparkline for the last week of moods.

   Each bar's HEIGHT encodes the mood level (great > good > okay > low > awful);
   each bar's OPACITY also reflects intensity so dips read as faded as well
   as short. Days the user didn't check in render as a tiny dim baseline,
   not skipped — so seven bars always show and the week's rhythm is visible.

   Monochrome by design — color would break the rest of the profile wall.
   ============================================================================ */

type MoodLevel = 'awful' | 'low' | 'okay' | 'good' | 'great'

interface Props {
  /** Last 7 days oldest→newest. null = no entry that day. */
  values: (MoodLevel | null)[]
  /** Total render height in px (bars + label). Defaults to 26. */
  height?: number
}

const LEVELS: Record<MoodLevel, { norm: number; alpha: number }> = {
  awful: { norm: 0.12, alpha: 0.32 },
  low:   { norm: 0.30, alpha: 0.45 },
  okay:  { norm: 0.55, alpha: 0.60 },
  good:  { norm: 0.78, alpha: 0.78 },
  great: { norm: 1.00, alpha: 0.95 },
}

export function MoodSpark({ values, height = 26 }: Props) {
  const bars = values.slice(0, 7)
  while (bars.length < 7) bars.push(null) // pad if shorter

  return (
    <div className="inline-flex items-end gap-[3px]" style={{ height }} aria-label="Mood last 7 days">
      {bars.map((v, i) => {
        if (!v) {
          // No entry — render a faint baseline dot so the day is still
          // present in the rhythm, not skipped.
          return (
            <span
              key={i}
              aria-hidden
              className="w-1 rounded-full bg-white/15"
              style={{ height: 2 }}
            />
          )
        }
        const { norm, alpha } = LEVELS[v]
        const h = Math.max(2, Math.round(norm * height))
        return (
          <span
            key={i}
            aria-label={v}
            className="w-1 rounded-full"
            style={{ height: h, backgroundColor: `rgba(255,255,255,${alpha})` }}
          />
        )
      })}
    </div>
  )
}
