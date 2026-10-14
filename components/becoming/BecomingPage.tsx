'use client'

import { Component, useEffect, useRef, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Lenis from 'lenis'
import { SECTIONS, STAGE_OF, carve, carvedProgress, sculpt, sectionAt, type Section } from './store'

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
const MIRROR: { label: string; era: string }[] = [
  { label: 'Build discipline', era: 'Discipline' },
  { label: 'Improve focus', era: 'Locked In' },
  { label: 'Get stronger', era: 'Gym Arc' },
  { label: 'Start over', era: 'Comeback' },
]
const RITUAL = [
  { label: 'Move', min: 20 },
  { label: 'Read', min: 15 },
  { label: 'Focus', min: 25 },
  { label: 'Reflect', min: 10 },
]

const chip = (on: boolean) =>
  `rounded-full px-3.5 py-1.5 text-xs transition ${on ? 'bg-white text-black' : 'border border-white/15 text-white/75 hover:border-white/40'}`

function Mirror() {
  const [pick, setPick] = useState<number | null>(null)
  return (
    <div className="mt-5">
      <div className="flex flex-wrap justify-center gap-2">
        {MIRROR.map((m, i) => (
          <button
            key={m.label}
            className={chip(pick === i)}
            aria-pressed={pick === i}
            onClick={() => {
              setPick(i)
              carve(STAGE_OF.intention, 0.35)
            }}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="mt-3 min-h-[1.25rem] text-xs text-white/55">
        {pick === null ? 'What are you trying to change? A demo: nothing is saved.' : `A place to start: the ${MIRROR[pick].era} era.`}
      </p>
    </div>
  )
}

function Ritual() {
  const [on, setOn] = useState<boolean[]>(RITUAL.map(() => false))
  const total = RITUAL.reduce((s, r, i) => s + (on[i] ? r.min : 0), 0)
  return (
    <div className="mt-5">
      <div className="flex flex-wrap justify-center gap-2">
        {RITUAL.map((r, i) => (
          <button
            key={r.label}
            className={chip(on[i])}
            aria-pressed={on[i]}
            onClick={() => {
              if (!on[i]) carve(STAGE_OF.discipline, 0.22)
              setOn((o) => o.map((v, j) => (j === i ? !v : v)))
            }}
          >
            {r.label} · {r.min} min
          </button>
        ))}
      </div>
      <p className="mt-3 min-h-[1.25rem] text-xs text-white/55">
        {total ? `${total} minutes a day. Small enough to keep.` : 'Shape a day. A demo: nothing is saved.'}
      </p>
    </div>
  )
}

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

/** What each chapter says: a caption, one line, and sometimes something to try. */
function Caption({ section }: { section: Section }) {
  switch (section) {
    case 'hero':
      return (
        <>
          <h1 className="font-[family-name:var(--font-cormorant)] text-5xl font-medium leading-[1.02] sm:text-7xl">
            You are not discovered. <span className="text-white/55">You are built.</span>
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
          <h2 className="caption-h">Every transformation begins somewhere.</h2>
          <p className="caption-p">Choose who you are becoming for the next thirty days: four chapters, one written mission a day.</p>
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
          <h2 className="caption-h">Change begins with a decision.</h2>
          <p className="caption-p">
            Each morning, one promise, small enough to keep. Your coach answers it, quoting what you said on day one on the days that lands hardest.
          </p>
          <Mirror />
        </>
      )
    case 'discipline':
      return (
        <>
          <h2 className="caption-h">Consistency gives intention its shape.</h2>
          <p className="caption-p">
            At night you answer honestly. Set a time and your coach calls you by name and asks for the day&rsquo;s promise out loud.
          </p>
          <Ritual />
        </>
      )
    case 'strength':
      return (
        <>
          <h2 className="caption-h">The body is built the same way.</h2>
          <p className="caption-p">
            Guided sessions, soundscapes, motivation and sleep audio, chosen for your era. Training and routines beside it, on a timer or in sequence.
          </p>
        </>
      )
    case 'polish':
      return (
        <>
          <h2 className="caption-h">Your own record, counted honestly.</h2>
          <p className="caption-p">
            Promises kept, the weekday you slip on, whether your certainty means anything. It says nothing until there is enough to say.
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
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Your coach&rsquo;s voice · {g.n} / iii</p>
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
          <h2 className="font-[family-name:var(--font-cormorant)] text-4xl font-medium sm:text-6xl">The masterpiece is never finished.</h2>
          <p className="caption-p">You become someone through what you choose to do, again and again.</p>
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
  useEffect(() => setLive(has3d()), [])

  // Smooth scrolling (Lenis); the scroll through the tall stage becomes
  // progress 0..6 for the carving.
  useEffect(() => {
    const html = document.documentElement
    const prev = html.style.scrollBehavior
    html.style.scrollBehavior = 'auto'
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const lenis = reduced ? null : new Lenis({ lerp: 0.075, wheelMultiplier: 0.8 })
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
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold tracking-[0.15em] text-white/80 hover:text-white">
              DOWNLOAD FREE
            </a>
          </header>

          {/* The chapter numeral, huge and faint behind everything. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-5 top-[9svh] font-[family-name:var(--font-cormorant)] text-[22vw] font-light leading-none text-white/[0.06] transition-opacity duration-700 sm:left-10 sm:text-[14vw]"
            style={{ opacity: NUMERAL[shown] ? 1 : 0 }}
          >
            {NUMERAL[shown]}
          </div>

          {/* Progress as chisel marks down the right edge. */}
          <div className="pointer-events-none absolute right-5 top-1/2 flex -translate-y-1/2 flex-col gap-3 sm:right-8" aria-hidden>
            {['I', 'II', 'III', 'IV', 'V'].map((n, i) => (
              <div key={n} className="flex items-center justify-end gap-2">
                <span className={`text-[10px] tracking-[0.2em] transition ${idx === i + 1 ? 'text-white/80' : 'text-white/0 sm:text-white/25'}`}>{n}</span>
                <span className={`h-px transition-all duration-500 ${idx > i ? 'w-6 bg-white/80' : 'w-3 bg-white/25'}`} />
              </div>
            ))}
          </div>

          {/* The caption, like a subtitle. */}
          <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-[6svh] text-center">
            <div
              className="pointer-events-auto mx-auto max-w-3xl transition-all duration-300"
              style={{ opacity: visible ? 1 : 0, transform: `translateY(${visible ? 0 : 10}px)` }}
              aria-live="polite"
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
