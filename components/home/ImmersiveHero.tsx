'use client'

/* ============================================================================
   Immersive Hero — the cinematic "you're entering a state" intro at the top
   of the home page. Per the mockup analysis: the home shouldn't feel like
   "opening a dashboard," it should feel like "entering a ritual."

   The hero centers a big AuraRing wrapping the time-of-day session art
   (same art the cards + player use, via getSessionImage so the whole app
   sees the same image for the day), with a state-of-mind copy line and a
   single primary CTA. The visual is the focal point; everything below it
   (carousel, sections) flows underneath.

   Desktop-only for the first pass — `hidden lg:flex` on the root. Mobile
   already has a working hero carousel and a smaller screen where a giant
   aura would crowd the rest of the page. Promote to mobile once the
   pattern is validated on desktop.
   ============================================================================ */

import { AuraRing } from '@/components/ui/Aura'
import { getSessionImage } from '@/lib/daily-guide/session-art'
import type { SessionType } from '@/lib/daily-guide/decision-tree'
import { ChevronRight, Check } from 'lucide-react'

interface ImmersiveHeroProps {
  /** The current "now" session — picked by ImmersiveHome's time-of-day logic. */
  session: SessionType
  /** Is the current session already done today? Hero pivots to a done state. */
  isCompleted: boolean
  /** Tap to begin (opens the Daily Guide flow — passed from ImmersiveHome). */
  onBegin: () => void
}

// State-of-mind copy. Each session reads as a *condition* the user is in,
// not a feature to tap — the title should land like a recognition, not a
// product name. (Pulled from the mockup analysis: "Your mind needs rest"
// reads emotionally; "Wind Down" reads as a feature.)
const HERO_COPY: Record<SessionType, {
  eyebrow: string
  title: string
  subtitle: string
  cta: string
}> = {
  morning_prime: {
    eyebrow: 'This morning',
    title: 'Begin with intention.',
    subtitle: 'Five minutes to set the day before it sets you.',
    cta: 'Start Morning Prime',
  },
  midday_reset: {
    eyebrow: 'Right now',
    title: 'Pause. Breathe. Reset.',
    subtitle: 'A short reset before the second half of the day.',
    cta: 'Start Midday Reset',
  },
  wind_down: {
    eyebrow: 'This evening',
    title: 'Your mind needs rest.',
    subtitle: 'Let the day land. Soften before sleep.',
    cta: 'Begin Wind Down',
  },
  bedtime_story: {
    eyebrow: 'Tonight',
    title: 'Drift into sleep.',
    subtitle: 'A motivational story to carry you under.',
    cta: 'Start Bedtime Story',
  },
}

const DONE_COPY: Record<SessionType, { eyebrow: string; title: string; subtitle: string }> = {
  morning_prime:  { eyebrow: 'This morning',  title: 'You set the day.',        subtitle: 'Morning Prime complete. The rest of the day is yours.' },
  midday_reset:   { eyebrow: 'Right now',     title: 'You reset.',              subtitle: 'Midday Reset complete. Carry it forward.' },
  wind_down:      { eyebrow: 'This evening',  title: 'You let the day land.',   subtitle: 'Wind Down complete. Rest is earned.' },
  bedtime_story:  { eyebrow: 'Tonight',       title: 'You showed up.',          subtitle: 'Bedtime Story complete. Sleep well.' },
}

export function ImmersiveHero({ session, isCompleted, onBegin }: ImmersiveHeroProps) {
  // Keep both branches at full type so the CTA narrows correctly below.
  const active = HERO_COPY[session]
  const done = DONE_COPY[session]
  const copy = isCompleted ? done : active
  const image = getSessionImage(session)

  return (
    <section
      aria-label="Now"
      className="hidden lg:flex relative flex-col items-center text-center pt-14 pb-10 px-8"
    >
      {/* Eyebrow — small uppercase context line so the big title doesn't
          stand alone without a frame. Reads like a chapter heading. */}
      <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-white/40 mb-7 animate-fade-in-down">
        {copy.eyebrow}
      </p>

      {/* Aura portal — the same daily-rotated session art wrapped in the
          signature aura ring. The ring's "active" state breathes when the
          session is pending and steadies to "idle" when complete, so the
          visual carries the day's status without needing extra UI. */}
      <div className="relative mb-9 animate-fade-in">
        <AuraRing size={280} stroke={2.5} state={isCompleted ? 'idle' : 'active'} breathe>
          <div className="rounded-full overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.6)]" style={{ width: 224, height: 224 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt=""
              className="w-full h-full object-cover ken-burns"
              style={{ objectPosition: '62% 50%' }}
            />
            {/* Soft inner vignette so the title above the ring still reads
                even when the image has bright sky / horizon */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(circle, transparent 50%, rgba(0,0,0,0.35) 100%)' }}
            />
          </div>
        </AuraRing>

        {/* Completed checkmark badge — sits on the bottom-right of the
            ring as a small "done" affordance. Only when complete. */}
        {isCompleted && (
          <div
            className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-[0_0_24px_rgba(255,255,255,0.4)]"
            aria-label="Session completed today"
          >
            <Check className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
        )}
      </div>

      {/* State copy — the emotional title + supporting sub. shimmer-text
          comes from globals.css and gives the title a slow living gradient
          that ties it to the Aura's motion language. */}
      <h2 className="text-[2.5rem] xl:text-5xl font-semibold tracking-tight text-white max-w-2xl leading-tight mb-3 shimmer-text">
        {copy.title}
      </h2>
      <p className="text-base xl:text-lg text-white/55 max-w-lg leading-relaxed mb-9">
        {copy.subtitle}
      </p>

      {/* Primary CTA — single decision, white-on-black pill with the same
          glow language as the rest of the hero. Hidden when complete (no
          need for an action when there's nothing to do). */}
      {!isCompleted && (
        <button
          onClick={onBegin}
          className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-black font-semibold text-[15px] hover:bg-white/95 transition-colors press-scale shadow-[0_0_50px_rgba(255,255,255,0.18)] focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
        >
          <span>{active.cta}</span>
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
        </button>
      )}
    </section>
  )
}

/**
 * Derive which session to feature in the hero from the current hour.
 * Same buckets as the existing getDailyGuideCTA so the hero stays in
 * sync with the rest of the home — extracted to a util so ImmersiveHome
 * can also use it to figure out the "isCompleted" status of the same
 * session from its journalData.
 */
export function getCurrentSession(): SessionType {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 11) return 'morning_prime'
  if (hour >= 11 && hour < 16) return 'midday_reset'
  if (hour >= 16 && hour < 21) return 'wind_down'
  return 'bedtime_story'
}
