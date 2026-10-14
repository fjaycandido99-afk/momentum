'use client'

import { Component, useEffect, useRef, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Lenis from 'lenis'
import { STAGE_OF, carve, sculpt, sectionEls, type Section } from './store'

// "The Art of Becoming" (preview at /becoming): a marble statue behind the
// page, carved as you scroll through what Voxu does. Every claim here is one
// the current /download page makes; the two demos (the Mirror, the ritual
// builder) are labelled as demos and send nothing anywhere.

const Sculpture = dynamic(() => import('./Sculpture'), { ssr: false })
const APP_STORE_URL = 'https://apps.apple.com/app/id6759702163'

function has3d() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

// The statue is decoration: if it fails, the page carries on without it.
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
  return <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_65%_40%,rgba(124,108,255,0.18),transparent_55%)]" />
}

function useSection(id: Section) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const entry = { id, el }
    sectionEls.push(entry)
    return () => {
      const i = sectionEls.indexOf(entry)
      if (i >= 0) sectionEls.splice(i, 1)
    }
  }, [id])
  return ref
}

// Text sits on the left over the dark side on wide screens; below laptop
// width it gets a dark panel so it stays readable over the statue.
const panel = 'rounded-3xl bg-black/75 p-6 ring-1 ring-white/5 lg:rounded-none lg:bg-transparent lg:p-0 lg:ring-0'

function Chapter({ id, stage, title, children }: { id: Section; stage?: string; title: ReactNode; children?: ReactNode }) {
  const ref = useSection(id)
  return (
    <section ref={ref} id={id} className="relative flex min-h-[110svh] items-end pb-16 pt-[48svh] lg:items-center lg:pb-0 lg:pt-0">
      <div className="mx-auto w-full max-w-6xl px-5">
        <div className={`max-w-md ${panel}`}>
          {stage && <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-violet-300/80">{stage}</p>}
          <h2 className="font-[family-name:var(--font-cormorant)] text-4xl font-medium leading-[1.05] sm:text-5xl">{title}</h2>
          {children}
        </div>
      </div>
    </section>
  )
}

function AppStoreButton() {
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-12 items-center gap-2.5 rounded-full bg-white px-6 text-sm font-semibold text-black transition hover:bg-white/90"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M16.37 1.43c0 1.14-.42 2.2-1.25 3.05-.9.94-2 1.48-3.18 1.39a3.4 3.4 0 0 1 1.27-2.96c.83-.78 2.03-1.33 3.16-1.48ZM20.6 17.3c-.55 1.27-.82 1.84-1.53 2.96-1 1.56-2.4 3.5-4.14 3.52-1.55.01-1.95-1-4.05-1-2.1.01-2.54 1.02-4.09 1-1.74-.02-3.07-1.77-4.07-3.33C-.07 16.1-.36 11.04 1.38 8.4c1.24-1.88 3.2-2.98 5.04-2.98 1.87 0 3.05 1.02 4.6 1.02 1.5 0 2.42-1.02 4.58-1.02 1.64 0 3.38.9 4.62 2.44-4.06 2.22-3.4 8.02.38 9.44Z" />
      </svg>
      Download on the App Store
    </a>
  )
}

const ERAS = ['Locked In', 'Discipline', 'Comeback', 'Gym Arc', 'Stoic Mode', 'Confidence', 'Study', '5AM']
const MIRROR: { label: string; era: string; line: string }[] = [
  { label: 'Build discipline', era: 'Discipline', line: 'Thirty days of one kept promise at a time.' },
  { label: 'Improve focus', era: 'Locked In', line: 'Fewer things, done properly, every day.' },
  { label: 'Get stronger', era: 'Gym Arc', line: 'The body, built the way everything else is.' },
  { label: 'Start over', era: 'Comeback', line: 'Day one again, with a record this time.' },
]
const RITUAL = [
  { label: 'Move', min: 20 },
  { label: 'Read', min: 15 },
  { label: 'Focus', min: 25 },
  { label: 'Reflect', min: 10 },
]
const VOICES = ['Stoic', 'Existentialist', 'Cynic', 'Hedonist', 'Samurai', 'Scholar', 'Manifestor', 'Hustler']

function Mirror() {
  const [pick, setPick] = useState<number | null>(null)
  const p = pick === null ? null : MIRROR[pick]
  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="font-[family-name:var(--font-cormorant)] text-2xl">What are you trying to change?</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {MIRROR.map((m, i) => (
          <button
            key={m.label}
            onClick={() => {
              setPick(i)
              carve(STAGE_OF.intention, 0.35)
            }}
            aria-pressed={pick === i}
            className={`rounded-xl px-3 py-2.5 text-left text-sm transition ${
              pick === i ? 'bg-white text-black' : 'border border-white/10 text-white/80 hover:border-white/30'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {p && (
        <p className="mt-4 text-sm text-white/70">
          A place to start: the <span className="text-white">{p.era}</span> era. {p.line}
        </p>
      )}
      <p className="mt-3 text-[11px] text-white/35">A demo. Nothing you pick here is saved or sent.</p>
    </div>
  )
}

function Ritual() {
  const [on, setOn] = useState<boolean[]>(RITUAL.map(() => false))
  const total = RITUAL.reduce((s, r, i) => s + (on[i] ? r.min : 0), 0)
  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm font-medium text-white/80">Shape a day</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {RITUAL.map((r, i) => (
          <button
            key={r.label}
            onClick={() => {
              setOn((o) => o.map((v, j) => (j === i ? !v : v)))
              if (!on[i]) carve(STAGE_OF.discipline, 0.22)
            }}
            aria-pressed={on[i]}
            className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${
              on[i] ? 'bg-white text-black' : 'border border-white/10 text-white/80 hover:border-white/30'
            }`}
          >
            {r.label}
            <span className={on[i] ? 'text-black/60' : 'text-white/40'}>{r.min} min</span>
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm text-white/70">{total ? `${total} minutes a day. Small enough to keep.` : 'Pick what you would do each day.'}</p>
      <p className="mt-3 text-[11px] text-white/35">A demo of the idea, not a routine saved to the app.</p>
    </div>
  )
}

export function BecomingPage() {
  const [live, setLive] = useState(false)
  useEffect(() => setLive(has3d()), [])

  // Smooth scrolling, so the carving and the camera glide with the page.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const html = document.documentElement
    const prev = html.style.scrollBehavior
    html.style.scrollBehavior = 'auto'
    const lenis = new Lenis({ lerp: 0.08, wheelMultiplier: 0.9 })
    let id = 0
    const raf = (t: number) => {
      lenis.raf(t)
      id = requestAnimationFrame(raf)
    }
    id = requestAnimationFrame(raf)
    return () => {
      cancelAnimationFrame(id)
      lenis.destroy()
      html.style.scrollBehavior = prev
    }
  }, [])
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      sculpt.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      sculpt.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    addEventListener('pointermove', onMove, { passive: true })
    return () => removeEventListener('pointermove', onMove)
  }, [])

  const heroRef = useSection('hero')
  const finalRef = useSection('final')

  return (
    <div className="relative min-h-screen bg-[#060609] text-white">
      <div className="fixed inset-0 z-0">
        {live ? (
          <SceneBoundary>
            <Sculpture />
          </SceneBoundary>
        ) : (
          <Fallback />
        )}
        {/* Darken the text side on wide screens, the lower half on phones. */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,transparent_40%,rgba(6,6,9,0.7)_70%,rgba(6,6,9,0.9)_100%)] lg:bg-[linear-gradient(90deg,rgba(6,6,9,0.92)_0%,rgba(6,6,9,0.55)_38%,transparent_62%)]" />
      </div>

      <header className="fixed inset-x-0 top-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/download" className="flex items-center gap-2">
            <span className="relative flex h-7 w-7 items-center justify-center">
              <span className="absolute inset-0 rounded-full border border-white/50" />
              <span className="absolute inset-[5px] rounded-full border border-white/70" />
              <span className="h-2 w-2 rounded-full bg-white" />
            </span>
            <span className="text-lg font-semibold tracking-wide">Voxu</span>
          </Link>
          <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-white/90">
            Download Free
          </a>
        </div>
      </header>

      {/* The page lets clicks through to the statue (drag to turn, hold to
          carve); only the text panels take them. */}
      <main className="pointer-events-none relative z-10 [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
        <section ref={heroRef} id="hero" className="relative flex min-h-[100svh] items-end pb-16 pt-[48svh] lg:items-center lg:pb-0 lg:pt-0">
          <div className="mx-auto w-full max-w-6xl px-5">
            <div className={`max-w-lg ${panel}`}>
              <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.3em] text-violet-300/80">Voxu · The art of becoming</p>
              <h1 className="font-[family-name:var(--font-cormorant)] text-5xl font-medium leading-[1.02] sm:text-7xl">
                You are not discovered.
                <br />
                <span className="text-white/60">You are built.</span>
              </h1>
              <p className="mt-6 text-base leading-relaxed text-white/65 sm:text-lg">
                Pick a 30-day era. Make one promise a day. Your coach answers it, asks at night whether you kept it, and keeps count — out loud, in a
                voice you choose.
              </p>
              <div className="mt-8 flex flex-col items-start gap-3">
                <AppStoreButton />
                <span className="text-sm text-white/40">Free to start. No credit card required.</span>
              </div>
              <p className="mt-10 text-xs text-white/35">Scroll, and watch the stone. Press and hold on the statue to carve it yourself.</p>
            </div>
          </div>
        </section>

        <Chapter id="potential" stage="Stage I · Potential" title="Every transformation begins somewhere.">
          <p className="mt-5 text-white/65">Choose who you are becoming for the next thirty days. Thirty days, four chapters, one written mission a day.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {ERAS.map((e) => (
              <span key={e} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/75">
                {e}
              </span>
            ))}
            <span className="rounded-full border border-dashed border-white/20 px-3 py-1 text-xs text-white/45">or name your own</span>
          </div>
        </Chapter>

        <Chapter id="intention" stage="Stage II · Intention" title="Change begins with a decision.">
          <p className="mt-5 text-white/65">
            Each morning you promise yourself one thing, small enough to keep. Your coach answers it, quoting what you said on day one on the days that
            lands hardest.
          </p>
          <Mirror />
        </Chapter>

        <Chapter id="discipline" stage="Stage III · Discipline" title="Consistency gives intention its shape.">
          <p className="mt-5 text-white/65">
            At night you answer honestly: did you keep it? Set a time and your coach calls you by name, tells you where you are in your era, and asks for
            the day&rsquo;s promise out loud.
          </p>
          <Ritual />
        </Chapter>

        <Chapter id="strength" stage="Stage IV · Strength" title="The body is built the same way.">
          <p className="mt-5 text-white/65">
            Guided sessions, ambient soundscapes, motivation and sleep audio, chosen to suit the era you are in. Training and routines sit beside it, run
            on a timer or in sequence.
          </p>
        </Chapter>

        <Chapter id="polish" stage="Stage V · Polish" title="Your own record, counted honestly.">
          <p className="mt-5 text-white/65">
            Promises kept, the weekday you slip on, whether your certainty means anything. Every figure shows the numbers behind it, and says nothing
            until there is enough to say.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              ['8', 'Eras to choose from'],
              ['30', 'Written missions per era'],
              ['8', 'Coach voices'],
              ['70+', 'Audio sessions'],
            ].map(([n, l]) => (
              <div key={l} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="font-[family-name:var(--font-cormorant)] text-3xl">{n}</div>
                <div className="mt-1 text-xs text-white/50">{l}</div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-relaxed text-white/45">
            {VOICES.join(', ')}. The mindset is how your coach talks to you; the era is what you are working on.
          </p>
        </Chapter>

        <section ref={finalRef} id="final" className="relative flex min-h-[110svh] items-end pb-24 pt-[48svh] lg:items-center lg:pb-0 lg:pt-0">
          <div className="mx-auto w-full max-w-6xl px-5">
            <div className={`max-w-lg ${panel}`}>
              <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.3em] text-violet-300/80">The next chapter</p>
              <h2 className="font-[family-name:var(--font-cormorant)] text-5xl font-medium leading-[1.02] sm:text-6xl">The masterpiece is never finished.</h2>
              <p className="mt-6 text-white/65">
                You don&rsquo;t become someone new in a day. You become them through what you choose to do, again and again.
              </p>
              <div className="mt-8 flex flex-col items-start gap-3">
                <AppStoreButton />
                <span className="text-sm text-white/40">Free to start. No credit card required.</span>
              </div>
            </div>
          </div>
        </section>

        <footer className="relative border-t border-white/5 bg-[#060609]/90 px-5 py-8">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm text-white/40">
            <span>© {new Date().getFullYear()} Voxu</span>
            <div className="flex flex-wrap gap-5">
              <Link href="/pricing" className="hover:text-white">Pricing</Link>
              <Link href="/support" className="hover:text-white">Support</Link>
              <Link href="/privacy" className="hover:text-white">Privacy</Link>
              <Link href="/terms" className="hover:text-white">Terms</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
