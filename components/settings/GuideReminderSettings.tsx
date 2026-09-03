'use client'

/**
 * When each Daily Guide segment nudges you.
 *
 * Before this, the four segments were inconsistent in a way users could
 * feel but not fix: Morning had a time picker, Bedtime was silently
 * derived as wake time minus eight hours, and Midday and Wind Down were
 * hardcoded to 13:00 and 19:00 in the sender. Now all four are the same
 * shape — a switch and a time — and the time is in the user's own
 * timezone, which is also how the sender matches them.
 *
 * Bedtime's field is intentionally allowed to stay empty: blank keeps the
 * old wake-minus-8h behaviour, so nobody's existing reminder jumps just
 * because this screen appeared.
 */

import { Sun, Sunrise, Wind, Moon } from 'lucide-react'

export interface GuideReminderValues {
  dailyReminder: boolean
  reminderTime: string
  middayEnabled: boolean
  middayTime: string
  winddownEnabled: boolean
  winddownTime: string
  bedtimeEnabled: boolean
  bedtimeTime: string
}

interface Row {
  /** React key only — not a field on GuideReminderValues. */
  key: string
  enabledKey: keyof GuideReminderValues
  timeKey: keyof GuideReminderValues
  label: string
  hint: string
  icon: typeof Sun
  placeholder: string
}

const ROWS: Row[] = [
  {
    key: 'morning',
    enabledKey: 'dailyReminder',
    timeKey: 'reminderTime',
    label: 'Morning Prime',
    hint: 'Wake up, set intention, energy',
    icon: Sunrise,
    placeholder: '07:00',
  },
  {
    key: 'midday',
    enabledKey: 'middayEnabled',
    timeKey: 'middayTime',
    label: 'Midday Reset',
    hint: 'Recharge, affirm, refocus',
    icon: Sun,
    placeholder: '13:00',
  },
  {
    key: 'winddown',
    enabledKey: 'winddownEnabled',
    timeKey: 'winddownTime',
    label: 'Wind Down',
    hint: 'Close the day out',
    icon: Wind,
    placeholder: '19:00',
  },
  {
    key: 'bedtime',
    enabledKey: 'bedtimeEnabled',
    timeKey: 'bedtimeTime',
    label: 'Bedtime Story',
    hint: 'Leave empty to follow your wake time',
    icon: Moon,
    placeholder: '22:00',
  },
]

interface Props {
  values: GuideReminderValues
  onChange: (patch: Partial<GuideReminderValues>) => void
}

export function GuideReminderSettings({ values, onChange }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-white/55 leading-relaxed mb-3">
        Each segment nudges you at the time you pick, in your own timezone.
      </p>

      {ROWS.map(row => {
        const Icon = row.icon
        const enabled = values[row.enabledKey] as boolean
        const time = values[row.timeKey] as string

        return (
          // Two lines, not one.
          //
          // The single-row version squeezed icon + label + time + switch
          // into ~350px and truncated everything: "Morning Pri…",
          // "Recharge, affir…". Worse, the time box was too narrow to show
          // the AM/PM the browser appends, so a 13:00 reminder rendered as
          // a bare "01:00" — a user reading that reasonably concludes
          // their midday nudge fires at one in the morning.
          <div
            key={row.key}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3"
          >
            <div className="flex items-center gap-3">
              <Icon className="h-4 w-4 shrink-0 text-white/60" />

              <div className="min-w-0 flex-1">
                <p className="text-sm text-white">{row.label}</p>
                <p className="text-[11px] leading-snug text-white/50">{row.hint}</p>
              </div>

              <button
                onClick={() => onChange({ [row.enabledKey]: !enabled } as Partial<GuideReminderValues>)}
                role="switch"
                aria-checked={enabled}
                aria-label={`${row.label} reminder`}
                className={`h-6 w-11 shrink-0 rounded-full transition-all press-scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                  enabled ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.25)]' : 'bg-white/10'
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full bg-white shadow-lg transition-transform ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <input
              type="time"
              value={time}
              disabled={!enabled}
              onChange={e => onChange({ [row.timeKey]: e.target.value } as Partial<GuideReminderValues>)}
              placeholder={row.placeholder}
              aria-label={`${row.label} reminder time`}
              style={{ colorScheme: 'dark' }}
              className="mt-2.5 ml-7 w-[calc(100%-1.75rem)] rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-sm text-white disabled:opacity-35 focus:border-white/40 focus:outline-none"
            />
          </div>
        )
      })}
    </div>
  )
}
