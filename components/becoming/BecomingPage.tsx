'use client'

import { Component, useEffect, useRef, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Lenis from 'lenis'
import { SECTIONS, carvedProgress, makePromise, sculpt, sectionAt, type Section } from './store'
import { NARRATION } from './script'

// "The Art of Becoming" (preview at /becoming). Not a page you scroll
// through but a gallery you stand in: one statue under one spotlight, the
// page pinned around it. Scrolling, or holding the chisel to the stone,
// carves it chapter by chapter; captions come and go like subtitles. Every
// claim is one the /download page already makes; the Mirror and the ritual
// builder are labelled demos and send nothing anywhere.

const Sculpture = dynamic(() => import('./Sculpture'), { ssr: false })
const APP_STORE_URL = 'https://apps.apple.com/app/id6759702163'
// A small chisel for the cursor over the stone.
const CHISEL = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><g transform="rotate(45 14 14)"><rect x="12" y="1" width="4" height="13" rx="1.5" fill="#c8a272"/><rect x="11" y="14" width="6" height="3" fill="#8a8f99"/><path d="M11.5 17h5l-1 9h-3z" fill="#e8ebf0"/></g></svg>',
)}") 4 24, crosshair`

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
  intention: 'II',
  discipline: 'III',
  strength: 'IV',
  polish: 'V',
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

function AppStoreButton() {
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
const GOLD = '#B69B73'
const kicker = 'text-[11px] uppercase tracking-[0.3em]'
function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className={kicker} style={{ color: GOLD }}>
      {children}
    </p>
  )
}

const PROMISES = ['Move my body for 20 minutes', 'Read for 15 minutes', 'Practise 10 minutes of stillness']

// "A glimpse of Voxu": make a promise, and the chisel strikes the stone.
function PromiseDemo() {
  const [pick, setPick] = useState<number | null>(null)
  const [made, setMade] = useState(false)
  return (
    <div className="mt-5">
      {!made ? (
        <>
          <p className="text-xs" style={{ color: '#96938F' }}>
            What will you promise yourself today?
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {PROMISES.map((p, i) => (
              <button key={p} className={chip(pick === i)} aria-pressed={pick === i} onClick={() => setPick(i)}>
                {p}
              </button>
            ))}
          </div>
          <button
            disabled={pick === null}
            onClick={() => {
              makePromise()
              setMade(true)
            }}
            className="mt-4 rounded-full px-5 py-2 text-xs font-semibold text-black transition disabled:opacity-30"
            style={{ background: GOLD }}
          >
            Make my promise
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-white/80">
            Promised: <span className="text-white">{PROMISES[pick ?? 0].toLowerCase()}</span>. That&rsquo;s a mark in the stone.
          </p>
          <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs underline underline-offset-4" style={{ color: GOLD }}>
            Make it for real in Voxu, free
          </a>
        </>
      )}
      <p className="mt-3 text-[11px] text-white/35">A demo: nothing here is saved.</p>
    </div>
  )
}

// The night check: did you keep it?
function NightCheck() {
  const [ans, setAns] = useState<null | 'yes' | 'no'>(null)
  return (
    <div className="mt-5">
      <p className="text-xs" style={{ color: '#96938F' }}>
        Tonight: did you keep your promise?
      </p>
      <div className="mt-3 flex justify-center gap-2">
        <button
          className={chip(ans === 'yes')}
          aria-pressed={ans === 'yes'}
          onClick={() => {
            if (ans !== 'yes') makePromise()
            setAns('yes')
          }}
        >
          I kept it
        </button>
        <button className={chip(ans === 'no')} aria-pressed={ans === 'no'} onClick={() => setAns('no')}>
          Not today
        </button>
      </div>
      <p className="mt-3 min-h-[1.25rem] text-xs text-white/55">
        {ans === 'yes' ? 'Another mark. Kept promises add up.' : ans === 'no' ? 'Said honestly. Tomorrow is another stone.' : 'A demo: nothing here is saved.'}
      </p>
    </div>
  )
}

/** What each chapter says: a caption, one line, and sometimes something to try. */
function Caption({ section }: { section: Section }) {
  switch (section) {
    case 'hero':
      return (
        <>
          <h1 className="font-[family-name:var(--font-cormorant)] text-5xl font-medium leading-[1.02] sm:text-7xl">
            You are not discovered. <span style={{ color: '#96938F' }}>You are built.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-white/60 sm:text-base">
            Pick a 30-day era. Make one promise a day. Your coach answers it, asks at night whether you kept it, and keeps count — out loud, in a voice
            you choose.
          </p>
          <p className="mt-5 text-[11px] uppercase tracking-[0.3em] text-white/40">Scroll to carve · or hold the chisel to the stone</p>
        </>
      )
    case 'potential':
      return (
        <>
          <Kicker>Chapter I · The Stone</Kicker>
          <h2 className="caption-h mt-2">Nobody becomes someone overnight.</h2>
          <p className="caption-p">Every change starts as an unfinished stone, and one decision. Choose who you are becoming for the next thirty days.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {ERAS.map((e) => (
              <span key={e} className="rounded-full border border-white/12 px-2.5 py-1 text-[11px] text-white/70">
                {e}
              </span>
            ))}
            <span className="rounded-full border border-dashed border-white/20 px-2.5 py-1 text-[11px] text-white/45">or your own</span>
          </div>
        </>
      )
    case 'intention':
      return (
        <>
          <Kicker>Chapter II · The Promise</Kicker>
          <h2 className="caption-h mt-2">Start with one promise.</h2>
          <p className="caption-p">
            Each morning, promise yourself one thing, small enough to keep. Your coach answers it, quoting what you said on day one on the days that
            lands hardest.
          </p>
          <PromiseDemo />
        </>
      )
    case 'discipline':
      return (
        <>
          <Kicker>Chapter III · The Resistance</Kicker>
          <h2 className="caption-h mt-2">Motivation fades. Your word remains.</h2>
          <p className="caption-p">
            At night your coach asks whether you kept it, and you answer honestly. Set a time and your coach calls you by name and asks for the
            day&rsquo;s promise out loud.
          </p>
          <NightCheck />
        </>
      )
    case 'strength':
      return (
        <>
          <Kicker>Chapter IV · The Proof</Kicker>
          <h2 className="caption-h mt-2">Every day leaves a mark.</h2>
          <p className="caption-p">
            Thirty days, one promise a day. Your record shows what you actually do: promises kept, the weekday you slip on. It says nothing until there
            is enough to say.
          </p>
        </>
      )
    case 'polish':
      return (
        <>
          <Kicker>Chapter V · The Becoming</Kicker>
          <h2 className="caption-h mt-2">Become someone you can count on.</h2>
          <p className="caption-p">
            Kept promises earn relics: coins like Said Out Loud, Word Kept and Era Complete, yours to wear. Guided sessions, soundscapes and sleep
            audio come with the era you are in.
          </p>
          <p className="mt-4 text-[11px] uppercase tracking-[0.25em] text-white/45">8 eras · 30 missions each · 8 coach voices · 70+ audio sessions</p>
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
            <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-white/45">
              Stoic · Existentialist · Cynic · Hedonist · Samurai · Scholar · Manifestor · Hustler
            </p>
          )}
          {section === 'stoic' && (
            <p className="mt-4 text-xs text-white/50">Eight mindsets. The mindset is how your coach talks to you; the era is what you work on.</p>
          )}
        </>
      )
    }
    case 'final':
      return (
        <>
          <h2 className="font-[family-name:var(--font-cormorant)] text-4xl font-medium sm:text-6xl">Becoming is not a destination. It is a practice.</h2>
          <p className="caption-p">Tomorrow there&rsquo;s another stone. Start your era.</p>
          <div className="mt-6 flex flex-col items-center gap-2.5">
            <AppStoreButton />
            <span className="text-xs text-white/40">Free to start. No credit card required.</span>
          </div>
        </>
      )
  }
}

export function BecomingPage() {
  const [live, setLive] = useState(false)
  const [section, setSection] = useState<Section>('hero')
  const [shown, setShown] = useState<Section>('hero')
  const stage = useRef<HTMLDivElement>(null)
  const lenisRef = useRef<Lenis | null>(null)
  useEffect(() => setLive(has3d()), [])

  // Smooth scrolling (Lenis); the scroll through the tall stage becomes
  // progress 0..6 for the carving.
  useEffect(() => {
    const html = document.documentElement
    const prev = html.style.scrollBehavior
    html.style.scrollBehavior = 'auto'
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const lenis = reduced ? null : new Lenis({ lerp: 0.075, wheelMultiplier: 0.8 })
    lenisRef.current = lenis
    let id = 0
    const tick = (t: number) => {
      lenis?.raf(t)
      const el = stage.current
      if (el) {
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
  // Captions cross-fade: the old one leaves, then the new one arrives.
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    if (section === shown) return
    setVisible(false)
    const t = setTimeout(() => {
      setShown(section)
      setVisible(true)
    }, 320)
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

  const idx = SECTIONS.indexOf(section)

  // Jump to a chapter: smooth scroll to the middle of its part of the stage.
  const goTo = (i: number) => {
    const el = stage.current
    if (!el) return
    const run = el.offsetHeight - window.innerHeight
    const y = el.offsetTop + (run * (i + 0.45)) / SECTIONS.length
    if (lenisRef.current) lenisRef.current.scrollTo(y, { duration: 2.2 })
    else window.scrollTo({ top: y, behavior: 'smooth' })
  }

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
    <div className="relative bg-[#060609] text-white">
      <style>{`
        .caption-h { font-family: var(--font-cormorant); font-weight: 500; line-height: 1.05; font-size: 2.25rem; }
        @media (min-width: 640px) { .caption-h { font-size: 3.4rem; } }
        .caption-p { margin: 0.9rem auto 0; max-width: 34rem; font-size: 0.95rem; color: rgba(255,255,255,0.6); }
        @keyframes grain { 0%,100% { transform: translate(0,0) } 25% { transform: translate(-2%,1%) } 50% { transform: translate(1%,-2%) } 75% { transform: translate(2%,2%) } }
      `}</style>

      {/* The stage: tall, so scrolling through it carves; its view is pinned. */}
      <div ref={stage} className="relative h-[1100svh]">
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          <div className="absolute inset-0" style={{ cursor: CHISEL }}>
            {live ? (
              <SceneBoundary>
                <Sculpture />
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
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42svh] bg-gradient-to-t from-black via-black/80 to-transparent" />

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
              <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold tracking-[0.15em]" style={{ color: GOLD }}>
                DOWNLOAD FREE
              </a>
            </div>
          </header>

          {/* The chapter numeral, huge and faint behind everything. */}
          <div
            aria-hidden
            className={`pointer-events-none absolute left-5 top-[9svh] font-[family-name:var(--font-cormorant)] text-[22vw] font-light leading-none text-white/[0.06] transition-opacity duration-700 sm:left-10 sm:text-[14vw] ${["potential", "intention", "discipline", "strength"].includes(shown) ? "xl:invisible" : ""}`}
            style={{ opacity: NUMERAL[shown] ? 1 : 0 }}
          >
            {NUMERAL[shown]}
          </div>

          {/* Progress as chisel marks down the right edge. */}
          <nav className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1 sm:right-6" aria-label="Chapters">
            {['I', 'II', 'III', 'IV', 'V'].map((n, i) => (
              <button key={n} onClick={() => goTo(i + 1)} className="group flex items-center justify-end gap-2 px-2 py-1.5" aria-label={`Chapter ${n}`}>
                <span className={`text-[10px] tracking-[0.2em] transition ${idx === i + 1 ? 'text-white/80' : 'text-white/0 group-hover:text-white/60 sm:text-white/25'}`}>{n}</span>
                <span className="h-px transition-all duration-500" style={{ width: idx > i ? 24 : 12, background: idx > i ? GOLD : 'rgba(255,255,255,0.25)' }} />
              </button>
            ))}
          </nav>

          {/* The caption, like a subtitle. */}
          <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-[6svh] text-center">
            <div
              className="pointer-events-auto mx-auto max-w-3xl transition-all duration-300"
              style={{ opacity: visible ? 1 : 0, transform: `translateY(${visible ? 0 : 10}px)` }}
              aria-live="polite"
              title={NARRATION[shown]}
            >
              <Caption section={shown} />
            </div>
          </div>
        </div>
      </div>

      <footer className="relative border-t border-white/5 bg-black px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-xs text-white/40">
          <span>© {new Date().getFullYear()} Voxu</span>
          <div className="flex flex-wrap gap-5">
            <Link href="/pricing" className="hover:text-white">Pricing</Link>
            <Link href="/support" className="hover:text-white">Support</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
