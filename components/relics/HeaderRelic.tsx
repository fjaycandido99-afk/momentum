'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Check, Share2, X } from 'lucide-react'
import { ShareRelicSheet } from './ShareRelicSheet'
import { AchievementBadge } from '@/components/progress/AchievementBadge'
import { ScrollLock } from '@/components/ui/ScrollLock'
import { getAchievementById } from '@/lib/achievements'
import { achievementLine } from '@/lib/achievement-lines'
import { MAX_EQUIPPED, nextShown, type RelicsPayload } from '@/lib/relics'
import { haptic } from '@/lib/haptics'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const
/** Which coin the header showed last, so the next open turns to the next one. */
const LAST_SHOWN_KEY = 'voxu.relic.lastShown'

function readLast(): string | null {
  try { return localStorage.getItem(LAST_SHOWN_KEY) } catch { return null }
}
function writeLast(id: string) {
  try { localStorage.setItem(LAST_SHOWN_KEY, id) } catch { /* storage off: it just won't rotate */ }
}

/** One coin, drawn with its rarity's metal. */
function Coin({ id, size, plain = true }: { id: string; size: number; plain?: boolean }) {
  const a = getAchievementById(id)
  if (!a) return null
  return <AchievementBadge id={a.id} category={a.category} icon={a.icon} rarity={a.rarity} unlocked plain={plain} size={size} />
}

/**
 * The relic in the Home header: the coin they chose to wear (or their rarest
 * until they choose). It holds still — the header is the one thing on screen
 * that should — except for ONE coin-flip when the app opens, turning to the
 * next of their equipped coins, and a flip when tapped. Nothing earned,
 * nothing shown: no empty slot asking for something.
 *
 * One GET per Home mount; not polled.
 */
export function HeaderRelic() {
  const [data, setData] = useState<RelicsPayload | null>(null)
  const [shown, setShown] = useState<string | null>(null)
  const [flipKey, setFlipKey] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/relics', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((d: RelicsPayload | null) => {
        if (cancelled || !d) return
        setData(d)
        const last = readLast()
        const next = nextShown(d.equipped, last, d.featured)
        // Start on the coin from last time, then flip once to the next.
        const start = last && d.equipped.includes(last) ? last : next
        setShown(start)
        if (next && next !== start) {
          window.setTimeout(() => { if (!cancelled) { setShown(next); setFlipKey(k => k + 1) } }, 700)
        }
        if (next) writeLast(next)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (!data || !shown) return null

  return (
    <>
      {/* Keyframes local to the coin (globals.css has mixed line endings). */}
      <style>{'@keyframes relic-flip{0%{transform:rotateY(90deg)}100%{transform:rotateY(0deg)}}'}</style>
      <button
        onClick={() => { haptic('light'); setOpen(true) }}
        aria-label={`Featured relic: ${getAchievementById(shown)?.title ?? ''}. Opens your relics.`}
        // Below 360px wide the header can't hold title + bell + search + coin + ring.
        className="hidden min-[360px]:flex items-center justify-center h-11 w-11 -mx-0.5 rounded-full press-scale [perspective:400px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <span
          key={flipKey}
          className="block motion-reduce:animate-none"
          style={flipKey > 0 ? { animation: 'relic-flip 420ms ease-out both' } : undefined}
        >
          <Coin id={shown} size={36} />
        </span>
      </button>
      {/* Portalled to <body>: the Home header animates in with a transform,
          which makes it the containing block for anything position:fixed
          inside it — the sheet rendered INSIDE the header instead of over
          the screen. */}
      {open && typeof document !== 'undefined' && createPortal(
        <RelicSheet
          data={data}
          onChange={d => {
            setData(d)
            if (d.featured && d.featured !== shown) { setShown(d.featured); setFlipKey(k => k + 1); writeLast(d.featured) }
          }}
          onClose={() => setOpen(false)}
        />,
        document.body,
      )}
    </>
  )
}

/**
 * Their relics: the three they wear (tap one to feature it in the header),
 * and the whole collection (tap a coin to wear it or take it off). Saves as
 * they tap; the server keeps only coins they have actually earned.
 */
function RelicSheet({ data, onChange, onClose }: {
  data: RelicsPayload
  onChange: (d: RelicsPayload) => void
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [sharing, setSharing] = useState<string | null>(null)

  const save = useCallback(async (featured: string | null, equipped: string[]) => {
    // Optimistic: the coins move now, the server confirms.
    onChange({ ...data, featured, equipped })
    setBusy(true)
    try {
      const res = await fetch('/api/relics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured, equipped }),
      })
      if (res.ok) onChange(await res.json())
      else { onChange(data); setNote('Couldn’t save that. Try again.') }
    } catch {
      onChange(data)
      setNote('Couldn’t reach Voxu. Check your connection.')
    } finally {
      setBusy(false)
    }
  }, [data, onChange])

  const toggle = (id: string) => {
    haptic('light')
    setNote(null)
    if (data.equipped.includes(id)) {
      if (data.equipped.length === 1) { setNote('Wear at least one.'); return }
      const equipped = data.equipped.filter(x => x !== id)
      save(data.featured === id ? equipped[0] : data.featured, equipped)
      return
    }
    if (data.equipped.length >= MAX_EQUIPPED) { setNote(`You can wear ${MAX_EQUIPPED}. Take one off first.`); return }
    save(data.featured, [...data.equipped, id])
  }

  const feature = (id: string) => {
    haptic('light')
    setNote(null)
    save(id, data.equipped)
  }

  const toggleCircle = async () => {
    haptic('light')
    const inCircle = !data.inCircle
    onChange({ ...data, inCircle })
    try {
      const res = await fetch('/api/relics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inCircle }),
      })
      if (res.ok) onChange(await res.json())
      else onChange(data)
    } catch {
      onChange(data)
    }
  }

  const featured = data.featured ? getAchievementById(data.featured) : null

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label="Your relics">
      <ScrollLock />
      <button className="absolute inset-0 bg-black/85 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <div
        className="relative w-full md:max-w-[520px] max-h-[85dvh] overflow-y-auto overflow-x-hidden overscroll-contain rounded-t-3xl md:rounded-3xl bg-[#0b0b0b] border border-white/[0.12] px-5 pt-5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">Your relics</p>
            <h2 className="text-[26px] text-white leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>
              What you wear
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-white/10 hover:bg-white/20 shrink-0">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* The three they wear. Tap one to put it in the header. */}
        <div className="flex justify-center gap-5 mt-5">
          {data.equipped.map(id => (
            <button key={id} onClick={() => feature(id)} disabled={busy} className="flex flex-col items-center gap-2 press-scale">
              <Coin id={id} size={id === data.featured ? 72 : 60} />
              <span className={`text-[10px] uppercase tracking-[0.18em] ${id === data.featured ? 'text-white/80' : 'text-white/35'}`}>
                {id === data.featured ? 'In your header' : 'Tap to feature'}
              </span>
            </button>
          ))}
        </div>
        {featured && (
          <div className="text-center mt-4">
            <p className="text-[18px] text-white" style={{ ...SERIF, fontWeight: 600 }}>{featured.title}</p>
            {achievementLine(featured.id) && (
              <p className="text-[15px] text-white/70 leading-snug mt-0.5" style={SERIF}>{achievementLine(featured.id)}</p>
            )}
            <button
              onClick={() => { haptic('light'); setSharing(featured.id) }}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/20 text-[13px] text-white/85 press-scale"
            >
              <Share2 className="w-3.5 h-3.5" /> Share this relic
            </button>
          </div>
        )}

        {/* Opt-in, off by default: the first thing about their achievements
            anyone else can see. Only matters if they appear in circles. */}
        <button
          onClick={toggleCircle}
          disabled={busy}
          role="switch"
          aria-checked={data.inCircle}
          className="mt-6 w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border border-white/15 text-left"
        >
          <span className="min-w-0">
            <span className="block text-[14px] text-white">Show my relics in my circle</span>
            <span className="block text-[11px] text-white/45 mt-0.5">The three you wear, beside your name. Nothing else.</span>
          </span>
          <span className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${data.inCircle ? 'bg-white' : 'bg-white/15'}`} aria-hidden>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${data.inCircle ? 'left-[22px] bg-black' : 'left-0.5 bg-white/70'}`} />
          </span>
        </button>

        <p className="text-[11px] uppercase tracking-[0.2em] text-white/45 mt-7">
          Your collection <span className="text-white/30 normal-case tracking-normal">· {data.earned.length} earned · wear up to {MAX_EQUIPPED}</span>
        </p>
        {note && <p className="text-[12px] text-white/70 mt-2" role="status">{note}</p>}
        <div className="grid grid-cols-4 gap-x-2 gap-y-4 mt-3">
          {data.earned.map(e => {
            const on = data.equipped.includes(e.id)
            return (
              <button
                key={e.id}
                onClick={() => toggle(e.id)}
                disabled={busy}
                aria-pressed={on}
                aria-label={`${e.title}${on ? ', worn' : ''}`}
                className="relative flex flex-col items-center gap-1.5 press-scale"
              >
                <Coin id={e.id} size={52} />
                {on && (
                  <span className="absolute top-0 right-1 w-5 h-5 rounded-full bg-white text-black flex items-center justify-center" aria-hidden>
                    <Check className="w-3 h-3" />
                  </span>
                )}
                <span className={`text-[10px] text-center leading-tight line-clamp-2 ${on ? 'text-white' : 'text-white/55'}`}>{e.title}</span>
              </button>
            )
          })}
        </div>

        <Link href="/progress" onClick={onClose} className="block text-center mt-6 py-3 rounded-xl border border-white/15 text-sm text-white/85">
          See every achievement
        </Link>
      </div>
      {sharing && <ShareRelicSheet id={sharing} onClose={() => setSharing(null)} />}
    </div>
  )
}
