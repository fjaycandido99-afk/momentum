'use client'

import { Component, createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Lenis from 'lenis'
import { SECTIONS, STEPS, STEP_NAME, carvedProgress, makePromise, nextStep, sculpt, sectionAt, stepAfter, stepBefore, visited, type Section } from './store'
import { NARRATION } from './script'
import { hasScreen, screenFor } from './PhonePreview'
import { AUDIO, DEMO_START, type DemoState } from './phoneScreens'
import { playSound, stopSound } from './soundPreview'

// "The Art of Becoming" (preview at /becoming). Not a page you scroll
// through but a film you sit in: one shot per chapter, statues in a black
// void and a moving camera (Objects.tsx), the page pinned around it; captions
// come and go like subtitles. Every claim is one the /download page already
// makes; the demos are labelled and send nothing anywhere.

// The film: the five artefacts in a black void (Objects.tsx).
const Objects = dynamic(() => import('./Objects'), { ssr: false })
const APP_STORE_URL = 'https://apps.apple.com/app/id6759702163'

function has3d() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

// The statue is the page, but if it can't load the words still stand.
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    console.warn('[becoming] 3D scene failed, showing the fallback', err)
  }
  render() {
    return this.state.failed ? <Fallback /> : this.props.children
  }
}
function Fallback() {
  return <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(255,240,220,0.12),transparent_50%)]" />
}

const NUMERAL: Record<Section, string> = {
  hero: '',
  potential: 'I',
  strength: 'II',
  discipline: 'III',
  polish: 'IV',
  intention: 'V',
  stoic: '',
  samurai: '',
  scholar: '',
  final: '',
}
// The gallery: three of the eight mindsets your coach can speak from.
const GALLERY_CAPTION: Partial<Record<Section, { n: string; title: string; line: string }>> = {
  stoic: { n: 'i', title: 'The Stoic.', line: 'Calm about what you can\u2019t control; exact about what you can.' },
  samurai: { n: 'ii', title: 'The Samurai.', line: 'Discipline as a way of living: quiet, exact, unhurried.' },
  scholar: { n: 'iii', title: 'The Scholar.', line: 'Understand it first. Then do the work, properly.' },
}
const ERAS = ['Locked In', 'Discipline', 'Comeback', 'Gym Arc', 'Stoic Mode', 'Confidence', 'Study', '5AM']

const chip = (on: boolean) =>
  `rounded-full px-3.5 py-1.5 text-xs transition ${on ? 'bg-white text-black' : 'border border-white/15 text-white/75 hover:border-white/40'}`

/** Website or the app's own intro: in the app there is nothing to download. */
const Mode = createContext<{ app: boolean; onBegin?: () => void }>({ app: false })

/** What the visitor has done in the demos; the phone shows it, the artefact reacts. */
const Demo = createContext<{ d: DemoState; set: (p: Partial<DemoState>) => void }>({ d: DEMO_START, set: () => {} })
/** The artefact for chapter `ch` gives a small start, as if it heard you. */
function react(ch: number) {
  sculpt.react = { chapter: ch, at: performance.now() }
}

function AppStoreButton() {
  const mode = useContext(Mode)
  if (mode.app) {
    return (
      <button
        onClick={mode.onBegin}
        className="inline-flex h-12 items-center rounded-full px-8 text-sm font-semibold tracking-[0.12em] text-black transition hover:brightness-110"
        style={{ background: GOLD }}
      >
        BEGIN
      </button>
    )
  }
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-11 items-center gap-2.5 rounded-full bg-white px-6 text-sm font-semibold text-black transition hover:bg-white/90"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M16.37 1.43c0 1.14-.42 2.2-1.25 3.05-.9.94-2 1.48-3.18 1.39a3.4 3.4 0 0 1 1.27-2.96c.83-.78 2.03-1.33 3.16-1.48ZM20.6 17.3c-.55 1.27-.82 1.84-1.53 2.96-1 1.56-2.4 3.5-4.14 3.52-1.55.01-1.95-1-4.05-1-2.1.01-2.54 1.02-4.09 1-1.74-.02-3.07-1.77-4.07-3.33C-.07 16.1-.36 11.04 1.38 8.4c1.24-1.88 3.2-2.98 5.04-2.98 1.87 0 3.05 1.02 4.6 1.02 1.5 0 2.42-1.02 4.58-1.02 1.64 0 3.38.9 4.62 2.44-4.06 2.22-3.4 8.02.38 9.44Z" />
      </svg>
      Download on the App Store
    </a>
  )
}

// The palette: warm ivory, stone grey, a muted antique gold used sparingly.
const GOLD = '#C9AE82'
const kicker = 'text-[11px] uppercase tracking-[0.3em]'
function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className={kicker} style={{ color: GOLD }}>
      {children}
    </p>
  )
}

const PROMISES = ['Move my body for 20 minutes', 'Read for 15 minutes', 'Practise 10 minutes of stillness']

// Daily Eras: pick one; the phone and the column follow.
function EraDemo() {
  const { d, set } = useContext(Demo)
  return (
    <div className="mt-4">
      <p className="text-xs" style={{ color: '#BDB8B0' }}>
        Try one on:
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-1.5 lg:justify-start">
        {ERAS.map((e) => (
          <button
            key={e}
            className={chip(d.era === e)}
            aria-pressed={d.era === e}
            onClick={() => {
              set({ era: e })
              react(1)
            }}
          >
            {e}
          </button>
        ))}
        <span className="rounded-full border border-dashed border-white/20 px-3.5 py-1.5 text-xs text-white/[0.78]">or your own</span>
      </div>
      <p className="mt-3 text-[11px] text-white/[0.55]">A demo: nothing here is saved.</p>
    </div>
  )
}

// AI Coach: choose today's promise and make it; the coach answers on the phone.
function PromiseDemo() {
  const { app } = useContext(Mode)
  const { d, set } = useContext(Demo)
  const [made, setMade] = useState(false)
  return (
    <div className="mt-5">
      <p className="text-xs" style={{ color: '#BDB8B0' }}>
        What will you promise yourself today?
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2 lg:justify-start">
        {PROMISES.map((p) => (
          <button
            key={p}
            className={chip(d.promise === p)}
            aria-pressed={d.promise === p}
            onClick={() => {
              set({ promise: p, night: null })
              setMade(false)
            }}
          >
            {p}
          </button>
        ))}
      </div>
      {!made ? (
        <button
          onClick={() => {
            makePromise()
            react(3)
            setMade(true)
          }}
          className="mt-4 rounded-full px-5 py-2 text-xs font-semibold text-black transition hover:brightness-110"
          style={{ background: GOLD }}
        >
          Make my promise
        </button>
      ) : (
        <p className="mt-4 text-sm text-white/80">
          Promised: <span className="text-white">{d.promise.toLowerCase()}</span>. Your coach&rsquo;s answer is on the phone.
          {!app && (
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs underline underline-offset-4" style={{ color: GOLD }}>
              Make it for real
            </a>
          )}
        </p>
      )}
      <p className="mt-3 text-[11px] text-white/[0.55]">A demo: nothing here is saved.</p>
    </div>
  )
}

// Reflection: answer tonight's check-in, honestly.
function NightCheck() {
  const { d, set } = useContext(Demo)
  const ans = d.night
  return (
    <div className="mt-5">
      <p className="text-xs" style={{ color: '#BDB8B0' }}>
        Tonight: did you keep &ldquo;{d.promise.toLowerCase()}&rdquo;?
      </p>
      <div className="mt-3 flex justify-center gap-2 lg:justify-start">
        <button
          className={chip(ans === 'yes')}
          aria-pressed={ans === 'yes'}
          onClick={() => {
            if (ans !== 'yes') makePromise()
            set({ night: 'yes' })
            react(2)
          }}
        >
          I kept it
        </button>
        <button
          className={chip(ans === 'no')}
          aria-pressed={ans === 'no'}
          onClick={() => {
            set({ night: 'no' })
            react(2)
          }}
        >
          Not today
        </button>
      </div>
      <p className="mt-3 min-h-[1.25rem] text-xs text-white/[0.78]">
        {ans === 'yes' ? 'Another mark. Kept promises add up.' : ans === 'no' ? 'Said honestly. Tomorrow is another day.' : 'A demo: nothing here is saved.'}
      </p>
    </div>
  )
}

// Habit Builder: keep today's promise and watch the record fill.
function HabitDemo() {
  const { d, set } = useContext(Demo)
  const today = Math.max(12, ...d.kept.map((k) => k + 1))
  const done = today > 30
  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
        <button
          disabled={done}
          onClick={() => {
            set({ kept: [...d.kept, today] })
            makePromise()
            react(4)
          }}
          className="rounded-full px-5 py-2 text-xs font-semibold text-black transition hover:brightness-110 disabled:opacity-30"
          style={{ background: GOLD }}
        >
          {done ? 'Era complete' : `Keep day ${today}`}
        </button>
        <button
          onClick={() => {
            set({ kept: DEMO_START.kept })
            react(4)
          }}
          className="text-xs text-white/[0.78] underline underline-offset-4 hover:text-white"
        >
          Start over
        </button>
      </div>
      <p className="mt-3 text-[11px] text-white/[0.55]">A demo: nothing here is saved.</p>
    </div>
  )
}

// Guided Audio: play an example sound; the headphones move with it.
function AudioDemo() {
  const { d, set } = useContext(Demo)
  return (
    <div className="mt-5 space-y-2">
      {AUDIO.map(([kind, title], i) => {
        const on = d.audio === i
        return (
          <button
            key={title}
            onClick={() => {
              if (on) {
                stopSound()
                set({ audio: null })
              } else {
                playSound(i)
                set({ audio: i })
                react(5)
              }
            }}
            aria-pressed={on}
            className={`flex w-full max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${on ? 'border-white/60 bg-white/10' : 'border-white/15 hover:border-white/40'}`}
          >
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${on ? 'bg-white text-black' : 'bg-white/10 text-white'}`} aria-hidden>
              {on ? '❚❚' : '▶'}
            </span>
            <span>
              <span className="block text-[10px] uppercase tracking-[0.25em] text-white/[0.6]">{kind}</span>
              <span className="block text-sm text-white">{title}</span>
            </span>
          </button>
        )
      })}
      <p className="pt-1 text-[11px] text-white/[0.55]">Example sounds made in your browser, not Voxu recordings.</p>
    </div>
  )
}

/** What each chapter says: a caption, one line, and sometimes something to try. */
function FreeLine() {
  if (useContext(Mode).app) return null
  return (
    <span className="text-xs text-white/[0.78]">
      Free to start. No credit card required.{' '}
      <a href="/?web=1" className="underline underline-offset-4 hover:text-white">
        Or start in your browser
      </a>
    </span>
  )
}

function Caption({ section }: { section: Section }) {
  switch (section) {
    case 'hero':
      return (
        <>
          <h1 className="font-[family-name:var(--font-cormorant)] text-[2.6rem] font-medium leading-[1.02] sm:text-7xl lg:text-[4.2rem]">
            You are not discovered. <span style={{ color: '#BDB8B0' }}>You are built.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-white/[0.78] sm:text-base lg:mx-0">
            Pick a 30-day era. Make one promise a day. Your coach answers it, asks at night whether you kept it, and keeps count — out loud, in a voice
            you choose.
          </p>
          <div className="mt-6 flex flex-col items-center gap-2 lg:items-start">
            <AppStoreButton />
            <FreeLine />
          </div>
          <p className="mt-5 text-[11px] uppercase tracking-[0.3em] text-white/[0.78]">Tap an object to explore · or scroll</p>
        </>
      )
    case 'potential':
      return (
        <>
          <Kicker>Step I · Daily Eras</Kicker>
          <h2 className="caption-h mt-2">Every climb starts with a direction.</h2>
          <p className="caption-p">
            Choose who you are becoming. Pick a 30-day era and work on one thing, a day at a time: thirty missions, one for each day, built for who you
            want to be.
          </p>
          <EraDemo />
        </>
      )
    case 'intention':
      return (
        <>
          <Kicker>Step V · Reflection</Kicker>
          <h2 className="caption-h mt-2">See how far you&rsquo;ve climbed.</h2>
          <p className="caption-p">
            Every night, an honest answer: your coach asks whether you kept today&rsquo;s promise, and you tell the truth. Over time your record shows
            what you actually do: promises kept, the weekday you slip on. It says nothing until there is enough to say.
          </p>
          <NightCheck />
          <div className="mt-6 flex flex-col items-center gap-2 lg:items-start">
            <AppStoreButton />
            <FreeLine />
          </div>
        </>
      )
    case 'discipline':
      return (
        <>
          <Kicker>Step III · AI Coach</Kicker>
          <h2 className="caption-h mt-2">You don&rsquo;t climb alone.</h2>
          <p className="caption-p">
            A coach that remembers your word. Each morning you promise yourself one thing, small enough to keep, and your coach answers it, quoting
            what you said on day one on the days that land hardest. Set a time and it calls you by name and asks for the day&rsquo;s promise out loud.
          </p>
          <PromiseDemo />
          <p className="mt-4 hidden text-[11px] uppercase tracking-[0.2em] text-white/[0.78] lg:block">
            Stoic · Existentialist · Cynic · Hedonist · Samurai · Scholar · Manifestor · Hustler
          </p>
          <p className="mt-2 hidden text-xs text-white/[0.78] lg:block">Eight mindsets. The mindset is how your coach talks to you; the era is what you work on.</p>
        </>
      )
    case 'strength':
      return (
        <>
          <Kicker>Step II · Habit Builder</Kicker>
          <h2 className="caption-h mt-2">One stone at a time.</h2>
          <p className="caption-p">
            Motivation fades; your word remains. Make one promise a day, thirty days in a row, and every one you keep is a step that holds. Kept
            promises earn relics: coins like Said Out Loud, Word Kept and Era Complete, yours to wear.
          </p>
          <HabitDemo />
        </>
      )
    case 'polish':
      return (
        <>
          <Kicker>Step IV · Guided Audio</Kicker>
          <h2 className="caption-h mt-2">Steady breath for the climb.</h2>
          <p className="caption-p">
            Focus by day, rest by night. Guided sessions, soundscapes and sleep audio come with the era you are in, so the practice follows you from
            your first promise to the last light out.
          </p>
          <AudioDemo />
          <p className="mt-4 hidden text-[11px] lg:block uppercase tracking-[0.25em] text-white/[0.78]">8 eras · 30 missions each · 8 coach voices · 70+ audio sessions</p>
        </>
      )
    case 'stoic':
    case 'samurai':
    case 'scholar': {
      const g = GALLERY_CAPTION[section]!
      return (
        <>
          <Kicker>Your coach&rsquo;s voice · {g.n} / iii</Kicker>
          <h2 className="caption-h mt-2">{g.title}</h2>
          <p className="caption-p">{g.line}</p>
          {section === 'scholar' && (
            <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-white/[0.78]">
              Stoic · Existentialist · Cynic · Hedonist · Samurai · Scholar · Manifestor · Hustler
            </p>
          )}
          {section === 'stoic' && (
            <p className="mt-4 text-xs text-white/[0.78]">Eight mindsets. The mindset is how your coach talks to you; the era is what you work on.</p>
          )}
        </>
      )
    }
    case 'final':
      return (
        <>
          <h2 className="font-[family-name:var(--font-cormorant)] text-4xl font-medium sm:text-6xl">Becoming is not a destination. It is a practice.</h2>
          <p className="caption-p">Tomorrow there&rsquo;s another stone. Start your era.</p>
          <div className="mt-6 flex flex-col items-center gap-2.5 lg:items-start">
            <AppStoreButton />
            <FreeLine />
          </div>
        </>
      )
  }
}

export function BecomingPage({ children, app = false, onBegin }: { children?: ReactNode; app?: boolean; onBegin?: () => void }) {
  const [live, setLive] = useState(false)
  const [section, setSection] = useState<Section>('hero')
  const [shown, setShown] = useState<Section>('hero')
  const stage = useRef<HTMLDivElement>(null)
  const lenisRef = useRef<Lenis | null>(null)
  // The story's progress animates on its own clock (not by scrolling the
  // page, which stutters on phones under WebGL): see the paging below.
  const tween = useRef({ active: false, from: 0, to: 0, t0: 0, dur: 1300 })
  const jumpRef = useRef<(i: number) => void>(() => {})
  // The objects film is a picker, not a story you scroll through: tap an
  // object to open its chapter; scrolling closes it again. (The older looks
  // keep the chapter-by-chapter scroll.)
  const picker = true
  const pickerRef = useRef(true)
  pickerRef.current = picker
  const [picked, setPicked] = useState(0)
  const overviewOpen = picker && picked === 0
  const [demo, setDemo] = useState<DemoState>(DEMO_START)
  const demoCtx = useMemo(() => ({ d: demo, set: (p: Partial<DemoState>) => setDemo((cur) => ({ ...cur, ...p })) }), [demo])
  const [phoneOpen, setPhoneOpen] = useState(false)
  // Leaving a chapter quiets the sound preview and closes the phone sheet.
  useEffect(() => {
    stopSound()
    setDemo((cur) => (cur.audio === null ? cur : { ...cur, audio: null }))
    setPhoneOpen(false)
  }, [picked])
  useEffect(() => () => stopSound(), [])
  // The 3D phone in the scene shows the open chapter's screen, with what the visitor did.
  useEffect(() => {
    sculpt.phone = { section: screenFor(shown), demo, v: sculpt.phone.v + 1, focus: phoneOpen }
  }, [shown, demo, phoneOpen])
  const pickedRef = useRef(0)
  pickedRef.current = picked
  useEffect(() => {
    sculpt.pick = picked
    if (picked) {
      visited.add(picked)
      sculpt.core.opened = visited.size
    }
  }, [picked])
  // The centrepiece's moment (every world opened, or it was tapped) changes what the overview says.
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    sculpt.core.onReveal = () => setRevealed(true)
    return () => {
      sculpt.core.onReveal = null
    }
  }, [])
  useEffect(() => {
    setLive(has3d())
  }, [])

  // Smooth scrolling (Lenis); the scroll through the tall stage becomes
  // progress 0..6 for the carving.
  useEffect(() => {
    const html = document.documentElement
    const prev = html.style.scrollBehavior
    html.style.scrollBehavior = 'auto'
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // No wheel smoothing: inside the story the wheel pages by chapter (below);
    // Lenis animates those steps.
    const lenis = reduced ? null : new Lenis({ smoothWheel: false })
    lenisRef.current = lenis
    let id = 0
    const tick = (t: number) => {
      lenis?.raf(t)
      const el = stage.current
      const tw = tween.current
      if (pickerRef.current) {
        const i = pickedRef.current
        sculpt.p = i ? i + 0.45 : 0
        const s = SECTIONS[i]
        setSection((cur) => (cur === s ? cur : s))
        id = requestAnimationFrame(tick)
        return
      }
      if (tw.active) {
        const k = Math.min(1, (performance.now() - tw.t0) / tw.dur)
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
        sculpt.p = tw.from + (tw.to - tw.from) * e
        if (k >= 1) tw.active = false
      } else if (el) {
        const r = el.getBoundingClientRect()
        const run = Math.max(1, el.offsetHeight - window.innerHeight)
        sculpt.p = Math.min(1, Math.max(0, -r.top / run)) * SECTIONS.length
      }
      const s = sectionAt(carvedProgress())
      setSection((cur) => (cur === s ? cur : s))
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(id)
      lenis?.destroy()
      html.style.scrollBehavior = prev
    }
  }, [])
  // Chapter by chapter: inside the story one flick, swipe or key press moves
  // exactly one chapter, so the 3D never drifts between two. Past the last
  // chapter the page scrolls normally again.
  useEffect(() => {
    const N = SECTIONS.length
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
    let busy = false
    let doneAt = 0
    let lastWheel = 0
    const geo = () => {
      const el = stage.current!
      const top = el.offsetTop
      const run = Math.max(1, el.offsetHeight - window.innerHeight)
      return { top, run, end: top + run }
    }
    const pos = (i: number) => {
      const { top, run } = geo()
      return i <= 0 ? top : top + (run * (i + 0.45)) / N
    }
    const inStage = () => {
      if (!stage.current) return false
      const { top, end } = geo()
      return window.scrollY >= top - 2 && window.scrollY <= end - 2
    }
    const nearest = () => {
      let best = 0
      for (let i = 1; i < N; i++) if (Math.abs(window.scrollY - pos(i)) < Math.abs(window.scrollY - pos(best))) best = i
      return best
    }
    const finish = () => {
      busy = false
      doneAt = performance.now()
    }
    const glide = (y: number) => {
      busy = true
      const { top, run, end } = geo()
      const l = lenisRef.current
      if (y > end) {
        // Leaving the story: a real scroll down to the sections below.
        if (l) l.scrollTo(y, { duration: 0.9, easing: ease, force: true, onComplete: finish })
        else {
          window.scrollTo({ top: y })
          setTimeout(finish, 300)
        }
        return
      }
      // Inside the story the view is pinned, so the page jumps at once and
      // only the story's progress animates: smooth on every device.
      const from = sculpt.p
      const to = (Math.min(Math.max(y - top, 0), run) / run) * N
      if (l) l.scrollTo(y, { immediate: true, force: true })
      else window.scrollTo(0, y)
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const dur = reduced ? 1 : 900 + Math.min(2, Math.abs(to - from)) * 400
      tween.current = { active: true, from, to, t0: performance.now(), dur }
      window.setTimeout(finish, Math.max(0, dur - 250))
    }
    jumpRef.current = (i: number) => {
      if (pickerRef.current) {
        if (!busy) {
          busy = true
          setPicked(i)
          window.scrollTo(0, 0)
          window.setTimeout(finish, 900)
        }
        return
      }
      if (!busy) glide(pos(i))
    }
    // Picker: while a chapter is open, any scroll gesture closes it (back to all five).
    const close = () => {
      if (busy || !pickedRef.current) return false
      busy = true
      setPicked(0)
      window.setTimeout(finish, 900)
      return true
    }
    const page = (dir: number) => {
      if (busy) return
      const i = nearest() + dir
      if (i < 0) return
      glide(i >= N ? geo().end + 1 : pos(i))
    }
    const onWheel = (e: WheelEvent) => {
      if (pickerRef.current) {
        if (!pickedRef.current) return
        e.preventDefault()
        const now = performance.now()
        const gap = now - lastWheel
        lastWheel = now
        if (Math.abs(e.deltaY) < 4 || (gap < 160 && now - doneAt < 700)) return
        close()
        return
      }
      if (!inStage()) return
      e.preventDefault()
      const now = performance.now()
      const gap = now - lastWheel
      lastWheel = now
      if (busy || Math.abs(e.deltaY) < 4) return
      // A trackpad keeps sending a coasting tail after a flick: only a fresh
      // gesture (a pause before it) turns the next page.
      if (gap < 160 && now - doneAt < 700) return
      page(Math.sign(e.deltaY))
    }
    // Inside a world, sideways moves along the climb: the next step, or the one before.
    const along = (dir: number) => {
      const c = dir > 0 ? stepAfter(pickedRef.current) : stepBefore(pickedRef.current)
      if (c) jumpRef.current(c)
    }
    let x0 = 0
    let y0 = 0
    let startedIn = false
    const onTouchStart = (e: TouchEvent) => {
      x0 = e.touches[0].clientX
      y0 = e.touches[0].clientY
      startedIn = pickerRef.current ? pickedRef.current > 0 : inStage()
    }
    const onTouchMove = (e: TouchEvent) => {
      if (startedIn && e.cancelable) e.preventDefault()
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (!startedIn) return
      const dx = x0 - e.changedTouches[0].clientX
      const dy = y0 - e.changedTouches[0].clientY
      // A sideways swipe in a world: left for the next step, right for the one before.
      if (pickerRef.current && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        along(Math.sign(dx))
        return
      }
      if (Math.abs(dy) <= 36) return
      if (pickerRef.current) close()
      else page(Math.sign(dy))
    }
    const onKey = (e: KeyboardEvent) => {
      if (pickerRef.current && pickedRef.current && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault()
        along(e.key === 'ArrowRight' ? 1 : -1)
        return
      }
      if (pickerRef.current) {
        if (pickedRef.current && ['Escape', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Backspace'].includes(e.key)) {
          e.preventDefault()
          close()
        }
        return
      }
      if (!inStage()) return
      const dir = ['ArrowDown', 'PageDown', ' '].includes(e.key) ? 1 : ['ArrowUp', 'PageUp'].includes(e.key) ? -1 : 0
      if (!dir) return
      e.preventDefault()
      page(dir)
    }
    // Arriving from below (or a jump) and stopping between chapters: settle.
    let settle = 0
    const onScroll = () => {
      clearTimeout(settle)
      settle = window.setTimeout(() => {
        if (pickerRef.current || busy || !inStage()) return
        const y = pos(nearest())
        if (Math.abs(window.scrollY - y) > 4) glide(y)
      }, 180)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      clearTimeout(settle)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  // Captions cross-fade: the old one leaves, then the new one arrives.
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    if (section === shown) return
    setVisible(false)
    const t = setTimeout(() => {
      setShown(section)
      setVisible(true)
    }, 140)
    return () => clearTimeout(t)
  }, [section, shown])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      sculpt.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      sculpt.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    addEventListener('pointermove', onMove, { passive: true })
    return () => removeEventListener('pointermove', onMove)
  }, [])


  // Jump to a chapter: smooth scroll to the middle of its part of the stage.
  const goTo = (i: number) => {
    jumpRef.current(i)
  }
  // Tapping an object in the scene jumps to its chapter.
  useEffect(() => {
    sculpt.jump = (i) => jumpRef.current(i)
    return () => {
      sculpt.jump = null
    }
  }, [])

  // Deep links: /download#chapter-3 opens on that chapter.
  useEffect(() => {
    const m = /^#chapter-([1-5])$/.exec(window.location.hash)
    if (!m) return
    if (pickerRef.current) {
      setPicked(Number(m[1]))
      return
    }
    const el = stage.current
    if (!el) return
    const run = el.offsetHeight - window.innerHeight
    window.scrollTo(0, el.offsetTop + (run * (Number(m[1]) + 0.45)) / SECTIONS.length)
  }, [])

  // Narration: Voxu Voice reads each chapter, once listening is switched on
  // (browsers only play sound after a tap, and nobody should be surprised).
  const [listen, setListen] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)
  useEffect(() => {
    if (!listen) {
      audio.current?.pause()
      return
    }
    const a = audio.current ?? new Audio()
    audio.current = a
    a.pause()
    a.src = `/audio/becoming/${shown}.mp3`
    a.play().catch(() => {
      /* file missing or blocked: the caption still says it */
    })
  }, [listen, shown])
  useEffect(() => () => audio.current?.pause(), [])

  return (
    <Mode.Provider value={{ app, onBegin }}>
    <Demo.Provider value={demoCtx}>
    <div className="relative bg-black text-white">
      <style>{`
        .caption-h { font-family: var(--font-cormorant); font-weight: 500; line-height: 1.05; font-size: 1.85rem; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @media (min-width: 640px) { .caption-h { font-size: 3rem; } }
        @media (min-width: 1024px) { .caption-h { font-size: 3.3rem; } .caption-p { margin-left: 0; } }
        .caption-p { margin: 0.7rem auto 0; max-width: 34rem; font-size: 0.88rem; line-height: 1.45; color: rgba(255,255,255,0.86); }
        @media (min-width: 1024px) { .caption-p { font-size: 0.95rem; line-height: 1.5; margin-top: 0.9rem; } }
        @keyframes grain { 0%,100% { transform: translate(0,0) } 25% { transform: translate(-2%,1%) } 50% { transform: translate(1%,-2%) } 75% { transform: translate(2%,2%) } }
      `}</style>

      {/* The stage: tall, so scrolling through it carves; its view is pinned. */}
      <div ref={stage} className={`relative ${picker ? 'h-[100svh]' : 'h-[1100svh]'}`}>
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          <div className="absolute inset-0">
            {live ? (
              <SceneBoundary>
                <Objects />
              </SceneBoundary>
            ) : (
              <Fallback />
            )}
          </div>

          {/* Film: letterbox, a vignette, a little grain. */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,transparent_45%,rgba(0,0,0,0.75)_100%)]" />
          <div
            className="pointer-events-none absolute -inset-[10%] opacity-[0.07] mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>')}")`,
              animation: 'grain 1.2s steps(4) infinite',
            }}
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[7svh] bg-black" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[28svh] bg-gradient-to-t from-black/90 to-transparent lg:hidden" />
          {/* Phones: a soft dark band across the middle, where the message sits. */}
          <div className="pointer-events-none absolute inset-x-0 top-[18%] h-[68%] bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.8)_22%,rgba(0,0,0,0.8)_78%,transparent)] transition-opacity duration-700 lg:hidden" style={{ opacity: overviewOpen ? 0 : 1 }} />
          {/* Wide screens: the message sits on the left, over a soft shade. */}
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[52vw] bg-gradient-to-r from-black/90 via-black/55 to-transparent transition-opacity duration-700 lg:block" style={{ opacity: overviewOpen ? 0 : 1 }} />

          {/* Header, inside the top letterbox. */}
          <header className="absolute inset-x-0 top-0 z-20 flex h-[7svh] min-h-[52px] items-center justify-between px-5 sm:px-8" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
            <Link href="/download" className="flex items-center gap-2">
              <span className="relative flex h-6 w-6 items-center justify-center">
                <span className="absolute inset-0 rounded-full border border-white/50" />
                <span className="absolute inset-[4px] rounded-full border border-white/70" />
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              <span className="text-sm font-semibold tracking-[0.2em]">VOXU</span>
            </Link>
            <div className="flex items-center gap-5">
              <button
                onClick={() => setListen((v) => !v)}
                aria-pressed={listen}
                className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.15em] text-white/70 hover:text-white"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M4 10v4h3l4 4V6L7 10H4Z" />
                  {listen ? <path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="m16 10 4 4m0-4-4 4" />}
                </svg>
                {listen ? 'VOXU IS SPEAKING' : 'LISTEN'}
              </button>
              {app ? (
                <button onClick={onBegin} className="text-xs font-semibold tracking-[0.15em] text-white/80 hover:text-white">
                  SKIP
                </button>
              ) : (
                            <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full px-4 py-2 text-xs font-semibold tracking-[0.12em] text-black transition hover:brightness-110"
                style={{ background: GOLD }}
              >
                DOWNLOAD FREE
              </a>
              )}
            </div>
          </header>

          {/* The chapter numeral, huge and faint behind everything. */}
          <div
            aria-hidden
            className={`pointer-events-none absolute left-5 top-[9svh] font-[family-name:var(--font-cormorant)] text-[22vw] font-light leading-none text-white/[0.06] transition-opacity duration-700 sm:left-10 sm:text-[14vw] lg:hidden`}
            style={{ opacity: NUMERAL[shown] ? 1 : 0 }}
          >
            {NUMERAL[shown]}
          </div>

          {/* The climb down the right edge: the five steps by name, the open one lit, the ones done in gold. */}
          <nav className="absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 sm:flex sm:right-8" aria-label="Steps">
            {/* The thread joining the steps, behind the dots. */}
            <span aria-hidden className="absolute bottom-4 left-[17px] top-4 w-px bg-white/15" />
            {STEPS.map((c, i) => {
              const open = picked === c
              const done = visited.has(c)
              return (
                <button key={c} onClick={() => goTo(c)} className="group relative flex items-center gap-3 px-2 py-1.5 text-left" aria-label={`Step ${i + 1}: ${STEP_NAME[c]}`}>
                  <span className="relative h-2 w-2 rounded-full transition" style={{ background: open || done ? GOLD : 'rgba(255,255,255,0.3)' }} />
                  <span className="w-6 text-[10px] tracking-[0.15em] text-white/35">{['I', 'II', 'III', 'IV', 'V'][i]}</span>
                  <span className={`text-[10px] uppercase tracking-[0.25em] transition ${open ? 'text-white' : done ? 'text-[#C9AE82]' : 'text-white/45 group-hover:text-white/[0.78]'}`}>{STEP_NAME[c]}</span>
                </button>
              )
            })}
          </nav>

          {/* Phones: a dark wash behind the overview's words, which sit over the bright water. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[30svh] bg-gradient-to-t from-black via-black/80 to-transparent transition-opacity duration-700 lg:hidden"
            style={{ opacity: overviewOpen ? 1 : 0 }}
          />
          {/* The overview: what this is, and one clear way in (the first step not yet taken). */}
          <div
            className="absolute inset-x-0 bottom-[6svh] z-10 px-6 text-center transition-opacity duration-700 lg:inset-x-auto lg:bottom-auto lg:left-[6vw] lg:top-1/2 lg:w-[36vw] lg:max-w-[560px] lg:-translate-y-1/2 lg:px-0 lg:text-left"
            style={{ opacity: overviewOpen ? 1 : 0, pointerEvents: overviewOpen ? 'auto' : 'none' }}
          >
            <p className="hidden text-[11px] uppercase tracking-[0.4em] text-white/[0.78] sm:block">The Voxu experience</p>
            <h1
              key={revealed ? 'r' : 'o'}
              className="mt-2 animate-[fadeIn_1.2s_ease] font-[family-name:var(--font-cormorant)] text-[1.75rem] font-medium uppercase leading-[1.02] sm:mt-3 sm:text-5xl lg:text-[4.1rem]"
              style={{ color: '#EDE3D1' }}
            >
              {revealed ? 'You are the work in progress.' : 'Step by step into a better you.'}
            </h1>
            {/* Phones keep it short: the steps need the room. */}
            <p className="mx-auto mt-4 hidden max-w-md text-[15px] leading-relaxed text-white/80 sm:block lg:mx-0 lg:text-base">
              {revealed ? 'Every choice shapes who you become.' : 'Five steps, one practice. Choose who you are becoming, keep one promise a day, and climb with a coach that remembers your word.'}
            </p>
            <button
              onClick={() => goTo(nextStep() || STEPS[0])}
              className="mt-4 inline-flex items-center gap-3 rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-black transition hover:brightness-110 sm:mt-6"
              style={{ background: GOLD }}
            >
              {nextStep() === STEPS[0] || !nextStep() ? 'Explore the worlds' : `Continue: ${STEP_NAME[nextStep()]}`}
              <span aria-hidden>→</span>
            </button>
          </div>

          {/* Phones: arrows at the edges to the step before and after (or swipe sideways). */}
          {picker && picked > 0 && !phoneOpen && (
            <>
              {stepBefore(picked) > 0 && (
                <button
                  onClick={() => goTo(stepBefore(picked))}
                  aria-label={`Back to ${STEP_NAME[stepBefore(picked)]}`}
                  className="absolute left-0 top-[24%] z-20 flex h-16 w-11 -translate-y-1/2 items-center justify-center text-3xl text-white/60 lg:hidden"
                >
                  ‹
                </button>
              )}
              {stepAfter(picked) > 0 && (
                <button
                  onClick={() => goTo(stepAfter(picked))}
                  aria-label={`On to ${STEP_NAME[stepAfter(picked)]}`}
                  className="absolute right-0 top-[24%] z-20 flex h-16 w-11 -translate-y-1/2 items-center justify-center text-3xl lg:hidden"
                  style={{ color: GOLD }}
                >
                  ›
                </button>
              )}
            </>
          )}

          {/* Phones: the 3D phone is brought up close; tap anywhere to put it back. */}
          {picker && picked > 0 && hasScreen(shown) && phoneOpen && (
            <button className="absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-black/70 to-transparent pb-[6svh] lg:hidden" onClick={() => setPhoneOpen(false)}>
              <span className="text-[11px] uppercase tracking-[0.25em] text-white/[0.78]">In the app · example · tap to close</span>
            </button>
          )}

          {/* The caption, like a subtitle. */}
          <div className={`absolute inset-x-0 z-10 px-4 text-center sm:px-8 lg:inset-x-auto lg:bottom-auto lg:left-[5vw] lg:top-1/2 lg:w-[34vw] lg:max-w-[560px] lg:-translate-y-1/2 lg:px-0 lg:text-left top-1/2 -translate-y-1/2`}>
            <div
              className="pointer-events-auto mx-auto max-w-4xl transition-all duration-200 [text-shadow:0_1px_2px_rgba(0,0,0,0.9),0_2px_22px_rgba(0,0,0,0.95)] lg:mx-0 lg:[text-shadow:none]"
              style={{ opacity: visible && !phoneOpen ? 1 : 0, transform: `translateY(${visible ? 0 : 10}px)` }}
              aria-live="polite"
              title={NARRATION[shown]}
            >
              {picker && shown === 'hero' ? null : <Caption section={shown} />}
              {picker && picked > 0 && (
                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 lg:justify-start">
                  {/* The climb goes on: the next step, or back to the bust after the last. */}
                  <button
                    onClick={() => (stepAfter(picked) ? goTo(stepAfter(picked)) : setPicked(0))}
                    className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.25em] transition hover:bg-[#C9AE82] hover:text-black"
                    style={{ borderColor: GOLD, color: GOLD }}
                  >
                    {stepAfter(picked) ? `Next: ${STEP_NAME[stepAfter(picked)]}` : 'Reach the top'}
                    <span aria-hidden>→</span>
                  </button>
                  <button onClick={() => setPicked(0)} className="text-[11px] uppercase tracking-[0.3em] text-white/[0.78] hover:text-white">
                    ← All steps
                  </button>
                </div>
              )}
              {picker && picked > 0 && hasScreen(shown) && (
                <button
                  onClick={() => setPhoneOpen(true)}
                  className="mt-4 text-[11px] uppercase tracking-[0.3em] lg:hidden"
                  style={{ color: GOLD }}
                >
                  See it in Voxu
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {!app && children}

      {!app && (
      <footer className="relative border-t border-white/5 bg-black px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-xs text-white/[0.78]">
          <span>© {new Date().getFullYear()} Voxu</span>
          <div className="flex flex-wrap gap-5">
            <Link href="/pricing" className="hover:text-white">Pricing</Link>
            <Link href="/support" className="hover:text-white">Support</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
          </div>
        </div>
      </footer>
      )}
    </div>
    </Demo.Provider>
    </Mode.Provider>
  )
}
