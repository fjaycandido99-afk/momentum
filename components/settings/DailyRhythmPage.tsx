'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BedDouble, BellOff, Briefcase, CalendarDays, ChevronRight, Leaf, Moon, Sparkles, SunMedium, Sunrise, Target, type LucideIcon } from 'lucide-react'
import { adaptPlan, timelinePoints, type AdaptKey, type FocusWindow, type RhythmPrefs } from '@/lib/rhythm/plan'
import { syncLocalReminders } from '@/lib/notifications'
import { haptic } from '@/lib/haptics'

/** The Daily Rhythm skin (Francis's "Nighttime Daily Rhythm" mockup). */
/** Fills: selected pills, switches, chips. */
export const ACCENT = '#5566F7'
/** Text on dark: times, chosen values. */
export const ACCENT_TEXT = '#8E9CFF'
const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const
/** The mockups' card, measured: near-black with a faint cool tint (#060b14–#0f1520). */
export const CARD = 'rounded-2xl border border-white/[0.07] bg-[#0a1019]/90 backdrop-blur-sm'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const FOCUS: { key: FocusWindow | null; label: string }[] = [
  { key: 'morning', label: 'Morning' },
  { key: 'afternoon', label: 'Afternoon' },
  { key: 'evening', label: 'Evening' },
  { key: null, label: 'Not sure' },
]

export function Section({ icon: Icon, title, sub, children }: { icon: LucideIcon; title: string; sub: string; children: ReactNode }) {
  return (
    <section className={`${CARD} overflow-hidden mt-5 first:mt-0`}>
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <span className="w-10 h-10 shrink-0 rounded-xl border border-white/10 bg-white/[0.04] flex items-center justify-center"><Icon className="w-5 h-5 text-white/85" /></span>
        <div className="min-w-0">
          <p className="text-px-20 text-white leading-tight" style={{ ...SERIF, fontWeight: 600 }}>{title}</p>
          <p className="text-px-12 text-white/55">{sub}</p>
        </div>
      </div>
      <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">{children}</div>
    </section>
  )
}

function TimeRow({ icon: Icon, title, sub, value, onChange, id }: { icon: LucideIcon; title: string; sub: string; value: string; onChange: (v: string) => void; id: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon className="w-5 h-5 shrink-0 text-white/70" aria-hidden />
      <label htmlFor={id} className="min-w-0 flex-1">
        <span className="block text-px-15 text-white">{title}</span>
        <span className="block text-px-12 text-white/50">{sub}</span>
      </label>
      <TimePill id={id} value={value} onChange={onChange} label={title} />
    </div>
  )
}

function TimePill({ id, value, onChange, label }: { id?: string; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <span className="relative shrink-0 flex items-center rounded-xl border border-white/10 bg-black/40 pl-3 pr-2 h-10">
      <input
        id={id}
        type="time"
        value={value}
        aria-label={label}
        onChange={e => e.target.value && onChange(e.target.value)}
        className="w-[6.9rem] bg-transparent text-px-14 text-white font-medium border-none outline-none"
        style={{ colorScheme: 'dark' }}
      />
      <ChevronRight className="w-4 h-4 text-white/35 pointer-events-none" aria-hidden />
    </span>
  )
}

function Segmented<T extends string | null>({ options, value, onChange, label }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-1 p-1 rounded-xl bg-black/30 border border-white/[0.06]" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(o => {
        const on = o.key === value
        return (
          <button
            key={String(o.key)}
            role="radio"
            aria-checked={on}
            onClick={() => { haptic('light'); onChange(o.key) }}
            className={`tap-44 py-2 rounded-lg text-px-13 transition-colors ${on ? 'text-white font-medium' : 'text-white/65'}`}
            style={on ? { background: ACCENT } : undefined}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => { haptic('light'); onChange(!on) }}
      className="relative shrink-0 w-12 h-7 rounded-full transition-colors"
      style={{ background: on ? ACCENT : 'rgba(255,255,255,0.15)' }}
    >
      <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

const DOT: Record<string, string> = { wake: '#F5B54A', focus: '#9B7BFF', work: '#6FA8FF', winddown: '#F59E4A', sleep: '#7C9BFF' }
const ROW_ART: Record<AdaptKey, { icon: LucideIcon; img?: string; tint: string }> = {
  wake: { icon: Sunrise, tint: '#F5B54A' },
  morning: { icon: Sunrise, img: '/scenes/home/sunrise-hero.jpg', tint: '#F5B54A' },
  focus: { icon: Target, tint: '#9B7BFF' },
  work: { icon: Briefcase, img: '/scenes/home/backdrop.jpg', tint: '#6FA8FF' },
  midday: { icon: SunMedium, img: '/scenes/home/sunrise-wide.jpg', tint: '#F5D04A' },
  winddown: { icon: Leaf, img: '/scenes/home/night-hero.jpg', tint: '#F59E4A' },
  bedtime: { icon: Moon, img: '/scenes/home/night-tall.jpg', tint: '#7C9BFF' },
  quiet: { icon: BellOff, tint: '#7C9BFF' },
}

/**
 * Settings › Daily Rhythm — "Teach Voxu what your day looks like."
 * Every control is read by something real (lib/rhythm/plan says what), and
 * "How Voxu will adapt" is built only from these settings.
 */
export function DailyRhythmPage() {
  const [p, setP] = useState<RhythmPrefs | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const pending = useRef<Record<string, unknown>>({})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/rhythm', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => setP({ wake_time: '07:00', work_start_time: '09:00', work_end_time: '17:00', work_days: [1, 2, 3, 4, 5], ...(d ?? {}) }))
      .catch(() => setP({}))
  }, [])

  // One debounced PUT of only what changed — never a stale field from elsewhere.
  const flush = useCallback(async () => {
    const body = pending.current
    pending.current = {}
    if (!Object.keys(body).length) return
    const res = await fetch('/api/rhythm', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null)
    if (!res?.ok) { setNote(res?.status === 401 ? 'Save your account to keep your rhythm.' : 'Couldn’t save that. Try again.'); return }
    setNote(null)
    void syncLocalReminders()
  }, [])
  const set = (patch: Partial<RhythmPrefs>) => {
    setP(prev => ({ ...(prev ?? {}), ...patch }))
    Object.assign(pending.current, patch)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void flush() }, 600)
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); void flush() }, [flush])

  const plan = useMemo(() => (p ? adaptPlan(p) : []), [p])
  const points = useMemo(() => (p ? timelinePoints(p) : []), [p])

  if (!p) return <div className="h-40" aria-busy="true" />
  const days = p.work_days?.length ? p.work_days : []
  const toggleDay = (d: number) => set({ work_days: days.includes(d) ? days.filter(x => x !== d) : [...days, d].sort() })

  return (
    <div className="pb-8">

      <Section icon={CalendarDays} title="Core schedule" sub="Your main daily structure.">
        <TimeRow id="rh-wake" icon={Sunrise} title="Wake time" sub="When you usually get up" value={p.wake_time ?? '07:00'} onChange={v => set({ wake_time: v })} />
        <TimeRow id="rh-ws" icon={Briefcase} title="Workday starts" sub="When you begin focused work" value={p.work_start_time ?? '09:00'} onChange={v => set({ work_start_time: v })} />
        <TimeRow id="rh-we" icon={Briefcase} title="Workday ends" sub="When your workday finishes" value={p.work_end_time ?? '17:00'} onChange={v => set({ work_end_time: v })} />
        <div className="px-4 py-3.5">
          <p className="text-px-15 text-white">Work days</p>
          <p className="text-px-12 text-white/50">Your regular work or school days</p>
          <div className="mt-2.5 grid grid-cols-7 gap-1.5">
            {DAYS.map((d, i) => {
              const on = days.includes(i)
              return (
                <button
                  key={d}
                  aria-pressed={on}
                  aria-label={`${d} work day`}
                  onClick={() => { haptic('light'); toggleDay(i) }}
                  className={`tap-44 h-10 rounded-xl text-px-13 ${on ? 'text-white font-medium' : 'text-white/60 bg-white/[0.04]'}`}
                  style={on ? { background: ACCENT } : undefined}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <BellOff className="w-5 h-5 shrink-0 text-white/70" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-px-15 text-white">Work mode</span>
            <span className="block text-px-12 text-white/50 leading-snug">On work days, during your workday, Voxu holds its own nudges. Reminders you set still come.</span>
          </span>
          <Toggle on={!!p.work_mode} label="Work mode" onChange={v => set({ work_mode: v })} />
        </div>
      </Section>

      <Section icon={Leaf} title="Your natural rhythm" sub="Help Voxu fit around you.">
        <div className="px-4 py-3.5">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 shrink-0 text-white/70" aria-hidden />
            <span>
              <span className="block text-px-15 text-white">Best focus window</span>
              <span className="block text-px-12 text-white/50">When do you feel most focused?</span>
            </span>
          </div>
          <div className="mt-2.5">
            <Segmented label="Best focus window" options={FOCUS} value={(p.focus_window as FocusWindow | null) ?? null} onChange={v => set({ focus_window: v })} />
          </div>
        </div>
        <TimeRow id="rh-bed" icon={BedDouble} title="Typical bedtime" sub={p.bedtime ? 'When you usually go to sleep' : 'Not set — tap to add'} value={p.bedtime ?? ''} onChange={v => set({ bedtime: v })} />
        <div className="px-4 py-3.5">
          <div className="flex items-center gap-3">
            <BellOff className="w-5 h-5 shrink-0 text-white/70" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-px-15 text-white">Quiet hours</span>
              <span className="block text-px-12 text-white/50">Only reminders you set come through</span>
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-2 justify-end">
            <TimePill value={p.quiet_start ?? '22:00'} onChange={v => set({ quiet_start: v, quiet_end: p.quiet_end ?? '07:00' })} label="Quiet hours start" />
            <span className="text-white/40 text-px-13">to</span>
            <TimePill value={p.quiet_end ?? '07:00'} onChange={v => set({ quiet_end: v, quiet_start: p.quiet_start ?? '22:00' })} label="Quiet hours end" />
          </div>
        </div>
      </Section>
      {note && <p className="mt-3 px-1 text-px-13 text-white/75" role="status">{note}</p>}

      {/* How Voxu will adapt — only what these settings really do. */}
      <h2 className="mt-9 text-px-24 text-white" style={{ ...SERIF, fontWeight: 600 }}>How Voxu will adapt</h2>
      <p className="text-px-13 text-white/60">Your day, as Voxu will work around it.</p>

      {points.length > 1 && (
        <div className="mt-5 px-1">
          <div className="flex justify-between gap-1">
            {points.map(pt => (
              <div key={pt.key} className="min-w-0 flex-1 text-center">
                <p className="text-px-12 text-white font-medium truncate">{pt.label}</p>
                <p className="text-px-10 text-white/55 truncate">{pt.time}</p>
              </div>
            ))}
          </div>
          <div className="relative mt-2 h-4">
            <div className="absolute inset-x-[6%] top-1/2 -translate-y-1/2 h-[3px] rounded-full" style={{ background: `linear-gradient(90deg, ${points.map(pt => DOT[pt.key]).join(', ')})`, boxShadow: `0 0 10px ${ACCENT}66` }} />
            <div className="absolute inset-0 flex justify-between">
              {points.map(pt => (
                <span key={pt.key} className="flex-1 flex justify-center items-center">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-[#0a1019]" style={{ background: DOT[pt.key], boxShadow: `0 0 10px ${DOT[pt.key]}` }} />
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 space-y-2.5">
        {plan.map(row => {
          const art = ROW_ART[row.key]
          const Icon = art.icon
          return (
            <div key={row.key} className={`${CARD} flex items-center gap-3.5 p-2.5 pr-4`}>
              <span className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden flex items-center justify-center" style={{ background: `radial-gradient(circle at 50% 40%, ${art.tint}55, #0a1019 75%)` }}>
                {art.img && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={art.img} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-70" />
                )}
                <Icon className="relative w-6 h-6 text-white drop-shadow" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-px-15 text-white">{row.title}</span>
                <span className="block text-px-14 font-medium" style={{ color: ACCENT_TEXT }}>{row.time}</span>
                <span className="block text-px-12 text-white/60 leading-snug">{row.body}</span>
              </span>
            </div>
          )
        })}
      </div>
      <p className="mt-2 px-1 text-px-12 text-white/45">Reminder times and switches live in Notifications.</p>

      <div className={`${CARD} mt-6 p-4`}>
        <p className="flex items-center gap-2 text-px-20 text-white" style={{ ...SERIF, fontWeight: 600 }}><Sparkles className="w-4 h-4" style={{ color: ACCENT_TEXT }} /> Why this matters</p>
        <p className="mt-1.5 text-px-13 text-white/65 leading-relaxed">Your rhythm helps Voxu suggest the hard things when you&rsquo;re sharpest, keep its own nudges out of your workday and your quiet hours, and remind you at times that fit your life.</p>
      </div>

    </div>
  )
}
