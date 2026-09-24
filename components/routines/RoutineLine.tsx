'use client'

/**
 * The routine, on home, in one line.
 *
 * "Training day · next up Today's promise at 7:00 am", and a tap to the
 * routine itself. Home is the quiet screen, and the routine is the shape of
 * the day — so it gets a line, not a card, and the line disappears whenever
 * it has nothing to say (paused, not a day it runs, nothing left on the
 * clock). The server decides that: see lib/routines/glance.
 *
 * It renders NOTHING while loading and nothing on failure. A skeleton for a
 * feature most people do not have yet is worse than the wait, and one line on
 * home is never worth an error state.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarClock, ChevronRight } from 'lucide-react'
import { GLANCE_HREF, type RoutineGlance } from '@/lib/routines/glance'

export function RoutineLine() {
  const [glance, setGlance] = useState<RoutineGlance | null>(null)

  useEffect(() => {
    let stale = false
    fetch('/api/routines/today')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (!stale) setGlance(data?.glance ?? null) })
      .catch(() => {})
    return () => { stale = true }
  }, [])

  if (!glance) return null

  return (
    <Link
      href={glance.href || GLANCE_HREF}
      className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.03] active:scale-[0.99]"
    >
      <CalendarClock className="w-3.5 h-3.5 shrink-0 text-white/45" />
      <span className="min-w-0 flex-1 text-[12.5px] leading-snug truncate">
        <span className="text-white/85">{glance.label}</span>
        <span className="text-white/45"> · {glance.line}</span>
      </span>
      <ChevronRight className="w-3.5 h-3.5 shrink-0 text-white/30" />
    </Link>
  )
}
