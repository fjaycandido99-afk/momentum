'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ReadSummary {
  lean: string | null
  leanName: string | null
  leanIcon: string | null
  confidence: string
  answered: number
  current: string | null
}

/**
 * A one-line read summary beside the mindset picker.
 *
 * This is the surface where the read is actually actionable: knowing your
 * answers lean Stoic is mildly interesting on Progress, but it is USEFUL
 * standing next to the control that changes your path. Nothing is switched
 * automatically — the mindset is the user's choice to make, and a run of
 * daily questions is not grounds for overriding it.
 */
export function DailyReadHint() {
  const [data, setData] = useState<ReadSummary | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/assessment/read')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (!data || !data.lean) return null

  const diverges = data.current && data.lean !== data.current

  return (
    <div className={`mb-4 px-3 py-2.5 rounded-xl border ${
      diverges ? 'bg-white/[0.06] border-white/[0.15]' : 'bg-white/5 border-white/10'
    }`}>
      <p className="text-xs text-white/80 leading-relaxed">
        <span className="mr-1">{data.leanIcon}</span>
        Your daily answers lean <span className="font-medium text-white">{data.leanName}</span>
        {diverges ? ", which isn't the path you're on." : '.'}
        {' '}
        <Link href="/progress" className="underline underline-offset-2 text-white/70 hover:text-white">
          See the read
        </Link>
      </p>
    </div>
  )
}
