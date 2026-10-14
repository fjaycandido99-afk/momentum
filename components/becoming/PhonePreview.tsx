'use client'

import type { ReactNode } from 'react'
import type { Section } from './store'

// The app beside the story: a phone showing the real screen each chapter
// is about (era picker, morning promise, night check-in, the record), drawn
// in code to match the app's own UI, with example data. No screenshots, so
// no real person's promises ever appear on the marketing site.

const serif = { fontFamily: 'var(--font-cormorant), Georgia, serif', fontWeight: 600 } as const
const eyebrow = 'text-[9px] uppercase tracking-[0.28em] text-white/60'
const card = 'rounded-[20px] border border-white/[0.14] bg-white/[0.06] p-3.5'

function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-[520px] w-[252px] rounded-[42px] border border-white/15 bg-[#050506] p-[9px] shadow-[0_30px_80px_rgba(0,0,0,0.7)]">
      <div className="relative h-full w-full overflow-hidden rounded-[34px] bg-[linear-gradient(180deg,#080b14,#040509)]">
        <div className="absolute left-1/2 top-2 h-[22px] w-[78px] -translate-x-1/2 rounded-full bg-black" />
        <div className="flex h-full flex-col px-4 pb-5 pt-11 text-white">{children}</div>
      </div>
    </div>
  )
}

function EraPicker() {
  const eras: [string, string][] = [
    ['Locked In', 'Stop drifting. Do the work that matters.'],
    ['Discipline Era', "Do it when you don't feel like it."],
    ['Gym Arc', 'Show up for your body, every day.'],
    ['Stoic Mode', 'Control what you can. Let go of the rest.'],
  ]
  return (
    <>
      <p className="text-[11px] text-white/55">Your Era · 30 days. One promise a day.</p>
      <p className="mt-3 text-[19px] font-medium leading-tight">Who are you becoming?</p>
      <p className="mt-1 text-[11px] text-white/55">Pick one for the next 30 days.</p>
      <div className="mt-3 space-y-2">
        {eras.map(([t, g], i) => (
          <div key={t} className={`rounded-2xl border bg-black p-3 ${i === 2 ? 'border-white/60' : 'border-white/[0.12]'}`}>
            <p className="text-[15px] uppercase leading-none" style={serif}>
              {t}
            </p>
            <p className="mt-1 text-[10px] text-white/65">{g}</p>
          </div>
        ))}
      </div>
      <div className="mt-auto rounded-xl bg-white py-2.5 text-center text-[12px] font-semibold text-black">Begin Gym Arc</div>
    </>
  )
}

function Promise() {
  return (
    <>
      <p className={eyebrow}>Current era</p>
      <p className="mt-1 text-[24px] uppercase leading-none" style={serif}>
        Gym Arc
      </p>
      <p className="mt-1 text-[10px] text-white/55">Chapter II · Day 12 / 30</p>
      <div className={`${card} mt-4`}>
        <p className={eyebrow}>Today&rsquo;s promise</p>
        <p className="mt-2 text-[15px] leading-snug" style={serif}>
          Read for 15 minutes before bed.
        </p>
        <p className="mt-3 text-[10px] text-white/55">How sure are you?</p>
        <div className="mt-1.5 flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={`grid h-6 w-6 place-items-center rounded-lg text-[10px] ${n === 4 ? 'bg-white text-black' : 'bg-white/[0.06] text-white/70'}`}>
              {n}
            </span>
          ))}
        </div>
      </div>
      <div className={`${card} mt-3`}>
        <p className={eyebrow}>Your coach</p>
        <p className="mt-2 border-l-2 border-white/25 pl-3 text-[11px] leading-relaxed text-white/80">
          Fifteen minutes is small enough to keep. On day one you said you wanted your evenings back. This is how.
        </p>
      </div>
    </>
  )
}

function NightCheck() {
  return (
    <>
      <p className={eyebrow}>Day 12 / 30</p>
      <div className={`${card} mt-4`}>
        <p className="text-[11px] text-white/60">Tonight — did you keep it?</p>
        <p className="mt-2 text-[15px] leading-snug" style={serif}>
          Read for 15 minutes before bed.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <span className="rounded-xl bg-white py-2.5 text-center text-[11px] font-semibold text-black">✓ I kept it</span>
          <span className="rounded-xl border border-white/[0.15] bg-white/[0.06] py-2.5 text-center text-[11px] text-white/80">✕ I didn&rsquo;t</span>
        </div>
      </div>
      <p className="mt-4 text-[12px] text-white/85">Kept. That one counts.</p>
      <p className="mt-3 text-[10px] text-white/55">What helped?</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {['Started early', 'Kept it small', 'The audio', 'The reminder'].map((c, i) => (
          <span key={c} className={`rounded-full border px-2.5 py-1 text-[10px] ${i === 1 ? 'border-white/60 bg-white/[0.12]' : 'border-white/[0.14] bg-white/[0.04] text-white/70'}`}>
            {c}
          </span>
        ))}
      </div>
    </>
  )
}

function Record() {
  // Day 12 of 30: ten kept, two broken, today, then the rest of the era.
  const broken = new Set([4, 9])
  return (
    <>
      <p className={eyebrow}>Gym Arc</p>
      <p className="mt-1 text-[34px] leading-none">
        Day 12<span className="text-white/35"> / 30</span>
      </p>
      <p className="mt-2 text-[10px] text-white/60">Promises kept: 83% (10 of 12) · 4-day streak</p>
      <div className="mt-4 grid grid-cols-6 gap-1.5">
        {Array.from({ length: 30 }, (_, i) => {
          const d = i + 1
          const cls =
            d < 12
              ? broken.has(d)
                ? 'border border-white/30 text-white/40 line-through'
                : 'bg-white text-black'
              : d === 12
                ? 'ring-2 ring-white/70 text-white'
                : 'bg-white/[0.03] text-white/25'
          return (
            <span key={d} className={`grid aspect-square place-items-center rounded-md text-[9px] ${cls}`}>
              {d}
            </span>
          )
        })}
      </div>
      <div className={`${card} mt-4`}>
        <p className={eyebrow}>On day 1 you said</p>
        <p className="mt-1.5 text-[13px] leading-snug" style={serif}>
          &ldquo;I want my evenings back.&rdquo;
        </p>
      </div>
    </>
  )
}

const SCREEN: Partial<Record<Section, () => JSX.Element>> = {
  potential: EraPicker,
  intention: Promise,
  discipline: NightCheck,
  strength: Record,
}

/** The phone for a chapter, or nothing for chapters without one. */
export function PhonePreview({ section, visible }: { section: Section; visible: boolean }) {
  const Screen = SCREEN[section]
  if (!Screen) return null
  return (
    <div
      className="pointer-events-none flex flex-col items-center transition-all duration-500"
      style={{ opacity: visible ? 1 : 0, transform: `translateY(${visible ? 0 : 14}px)` }}
    >
      <Phone>
        <Screen />
      </Phone>
      <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-white/35">The app · example data</p>
    </div>
  )
}
