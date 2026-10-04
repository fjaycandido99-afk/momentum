/**
 * Settings › Daily Rhythm, as rules. Pure.
 *
 * Every row of "How Voxu will adapt" comes from here and describes something
 * Voxu really does with these settings — nothing is shown that isn't wired:
 *   quiet hours  → lib/notification-gate holds Voxu's own pushes
 *   work mode    → (opt-in) the gate holds Voxu's own pushes on work days, work hours
 *   bedtime      → bedtime reminder falls back to 30 min before it
 *   focus window → the coach suggests hard things for that window
 *   reminders    → the four audio reminders at their Settings times
 */

export type FocusWindow = 'morning' | 'afternoon' | 'evening'
export const FOCUS_WINDOWS: FocusWindow[] = ['morning', 'afternoon', 'evening']
export function isFocusWindow(v: unknown): v is FocusWindow {
  return typeof v === 'string' && (FOCUS_WINDOWS as string[]).includes(v)
}

export const DEFAULT_QUIET = { start: '22:00', end: '07:00' } as const

export interface RhythmPrefs {
  wake_time?: string | null
  work_start_time?: string | null
  work_end_time?: string | null
  work_days?: number[] | null
  focus_window?: string | null
  bedtime?: string | null
  quiet_start?: string | null
  quiet_end?: string | null
  work_mode?: boolean | null
  daily_reminder?: boolean | null
  reminder_time?: string | null
  midday_reminder_enabled?: boolean | null
  midday_reminder_time?: string | null
  winddown_reminder_enabled?: boolean | null
  winddown_reminder_time?: string | null
  bedtime_reminder_enabled?: boolean | null
  bedtime_reminder_time?: string | null
}

/** "HH:MM" → minutes after midnight, or null. */
export function toMin(t: string | null | undefined): number | null {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return null
  const [h, m] = t.split(':').map(Number)
  if (h > 23 || m > 59) return null
  return h * 60 + m
}
export function fromMin(m: number): string {
  const x = ((Math.round(m) % 1440) + 1440) % 1440
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`
}
/** 330 → "5:30 AM" */
export function label(m: number): string {
  const x = ((Math.round(m) % 1440) + 1440) % 1440
  const h = Math.floor(x / 60), mm = x % 60
  return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}
export function isValidTime(t: unknown): t is string {
  return typeof t === 'string' && toMin(t) !== null
}

/** Is `m` inside [start, end), where the window may wrap past midnight? */
export function inWindow(m: number, start: number, end: number): boolean {
  if (start === end) return false
  return start < end ? m >= start && m < end : m >= start || m < end
}

export function quietWindow(p: RhythmPrefs): { start: number; end: number } {
  return {
    start: toMin(p.quiet_start) ?? toMin(DEFAULT_QUIET.start)!,
    end: toMin(p.quiet_end) ?? toMin(DEFAULT_QUIET.end)!,
  }
}

const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5]
/** Work hours on a work day — when Voxu holds its own nudges. */
export function isWorkTime(p: RhythmPrefs, weekday: number, minute: number): boolean {
  const s = toMin(p.work_start_time), e = toMin(p.work_end_time)
  if (s === null || e === null) return false
  const days = p.work_days?.length ? p.work_days : DEFAULT_WORK_DAYS
  return days.includes(weekday) && inWindow(minute, s, e)
}

/** The bedtime reminder's time: theirs, else 30 min before their bedtime, else 8h before waking. */
export function bedtimeReminderMin(p: RhythmPrefs): number {
  const own = toMin(p.bedtime_reminder_time)
  if (own !== null) return own
  const bed = toMin(p.bedtime)
  if (bed !== null) return (bed - 30 + 1440) % 1440
  const wake = toMin(p.wake_time) ?? 420
  return (Math.floor(wake / 60) * 60 + 16 * 60) % 1440
}

/** The focus window as a time range, fitted around wake time and the workday. */
export function focusRange(p: RhythmPrefs): { start: number; end: number } | null {
  if (!isFocusWindow(p.focus_window)) return null
  const wake = toMin(p.wake_time) ?? 420
  const ws = toMin(p.work_start_time), we = toMin(p.work_end_time)
  if (p.focus_window === 'morning') {
    const start = wake + 90
    const end = ws !== null && ws - start >= 60 ? ws : start + 120
    return { start, end }
  }
  if (p.focus_window === 'afternoon') return { start: 13 * 60, end: 16 * 60 }
  const start = we !== null && we >= 15 * 60 ? we + 60 : 18 * 60
  return { start, end: start + 120 }
}

const FOCUS_WORDS: Record<FocusWindow, string> = {
  morning: 'mornings',
  afternoon: 'afternoons',
  evening: 'evenings',
}
/** One line for the coach's prompt, or ''. */
export function focusPromptLine(p: RhythmPrefs): string {
  const r = focusRange(p)
  if (!r || !isFocusWindow(p.focus_window)) return ''
  return `THEIR BEST FOCUS (their own setting): ${FOCUS_WORDS[p.focus_window]}, about ${label(r.start)}–${label(r.end)}. When you suggest when to do something hard or important, suggest that window.`
}

export type AdaptKey = 'wake' | 'morning' | 'focus' | 'work' | 'midday' | 'winddown' | 'bedtime' | 'quiet'
export interface AdaptRow { key: AdaptKey; at: number; time: string; title: string; body: string }

/** "How Voxu will adapt": every row is something Voxu does with these settings. */
export function adaptPlan(p: RhythmPrefs): AdaptRow[] {
  const rows: AdaptRow[] = []
  const q = quietWindow(p)
  if (p.daily_reminder !== false) {
    const m = toMin(p.reminder_time) ?? 420
    rows.push({ key: 'morning', at: m, time: label(m), title: 'Morning Prime', body: 'Your morning session reminder — set your promise for the day.' })
  }
  const f = focusRange(p)
  if (f) rows.push({ key: 'focus', at: f.start, time: `${label(f.start)} – ${label(f.end)}`, title: 'Focus time', body: 'When Voxu suggests the hard thing — your promise, your deepest work.' })
  const ws = toMin(p.work_start_time), we = toMin(p.work_end_time)
  if (p.work_mode && ws !== null && we !== null) rows.push({ key: 'work', at: ws, time: `${label(ws)} – ${label(we)}`, title: 'Work mode', body: 'Fewer interruptions: Voxu holds its own nudges. Reminders you set still come.' })
  if (p.midday_reminder_enabled !== false) {
    const m = toMin(p.midday_reminder_time) ?? 780
    rows.push({ key: 'midday', at: m, time: label(m), title: 'Midday Reset', body: 'A few minutes to recharge and refocus.' })
  }
  if (p.winddown_reminder_enabled !== false) {
    const m = toMin(p.winddown_reminder_time) ?? 1140
    rows.push({ key: 'winddown', at: m, time: label(m), title: 'Wind Down', body: 'A guided reset to close the day out.' })
  }
  if (p.bedtime_reminder_enabled) {
    const m = bedtimeReminderMin(p)
    rows.push({ key: 'bedtime', at: m, time: label(m), title: 'Bedtime Story', body: 'Your reminder to wind down for sleep.' })
  }
  rows.push({ key: 'quiet', at: q.start, time: `${label(q.start)} – ${label(q.end)}`, title: 'Quiet hours', body: 'Only reminders you set yourself. Nothing else from Voxu.' })
  // Ordered through the day, starting from waking.
  const wake = toMin(p.wake_time) ?? 420
  return rows.sort((a, b) => ((a.at - wake + 1440) % 1440) - ((b.at - wake + 1440) % 1440))
}

/** The thin timeline across the top: Wake → Focus → Work → Wind down → Sleep. */
export function timelinePoints(p: RhythmPrefs): { key: string; label: string; time: string }[] {
  const out: { key: string; label: string; time: string }[] = []
  const wake = toMin(p.wake_time)
  if (wake !== null) out.push({ key: 'wake', label: 'Wake', time: label(wake) })
  const f = focusRange(p)
  if (f) out.push({ key: 'focus', label: 'Focus', time: label(f.start) })
  const ws = toMin(p.work_start_time), we = toMin(p.work_end_time)
  if (ws !== null && we !== null) out.push({ key: 'work', label: 'Work', time: `${label(ws).replace(':00', '')}–${label(we).replace(':00', '')}` })
  if (p.winddown_reminder_enabled !== false) out.push({ key: 'winddown', label: 'Wind down', time: label(toMin(p.winddown_reminder_time) ?? 1140) })
  const bed = toMin(p.bedtime)
  if (bed !== null) out.push({ key: 'sleep', label: 'Sleep', time: label(bed) })
  return out
}
