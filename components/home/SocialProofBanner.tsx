'use client'

import { useState, useEffect, useMemo } from 'react'
import { useMindsetOptional } from '@/contexts/MindsetContext'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'

function seededHash(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

function getActiveUserCount(dateSeed: number): number {
  return Math.floor(800 + seededHash(dateSeed) * 700) // 800-1500
}

function getMessages(count: number, mindsetName: string | null): string[] {
  const base = [
    `${count.toLocaleString()} building momentum`,
    `${count.toLocaleString()} active now`,
    `${count.toLocaleString()} on their journey`,
  ]
  if (mindsetName) {
    base.push(`${Math.floor(count * 0.3).toLocaleString()} ${mindsetName}s today`)
  }
  return base
}

export function SocialProofBanner() {
  const mindsetCtx = useMindsetOptional()
  const [messageIndex, setMessageIndex] = useState(0)
  const [visible, setVisible] = useState(false)

  const now = new Date()
  const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  const count = useMemo(() => getActiveUserCount(dateSeed), [dateSeed])

  const mindsetName = mindsetCtx?.config ? MINDSET_CONFIGS[mindsetCtx.mindset]?.name || null : null
  const messages = useMemo(() => getMessages(count, mindsetName), [count, mindsetName])

  // Show briefly, then hide. Reappear with new message after a long pause.
  // Pattern: 3s delay → show 4s → hide → 30s pause → show 4s → hide → done
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    // First appearance after 3s
    timers.push(setTimeout(() => {
      setVisible(true)
    }, 3000))

    // Hide after 7s (3s delay + 4s visible)
    timers.push(setTimeout(() => {
      setVisible(false)
    }, 7000))

    // Second appearance at 37s with new message
    timers.push(setTimeout(() => {
      setMessageIndex(1)
      setVisible(true)
    }, 37000))

    // Hide second at 41s
    timers.push(setTimeout(() => {
      setVisible(false)
    }, 41000))

    // Third appearance at 90s
    timers.push(setTimeout(() => {
      setMessageIndex(prev => (prev + 1) % messages.length)
      setVisible(true)
    }, 90000))

    // Hide third at 94s
    timers.push(setTimeout(() => {
      setVisible(false)
    }, 94000))

    return () => timers.forEach(clearTimeout)
  }, [messages.length])

  return (
    <div
      className={`fixed left-3 bottom-28 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-sm border border-white/10 transition-all duration-500 pointer-events-none ${
        visible
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 -translate-x-4'
      }`}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
      </span>
      <p className="text-[10px] text-white/70 font-medium whitespace-nowrap">
        {messages[messageIndex]}
      </p>
    </div>
  )
}
