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
    `${count.toLocaleString()} people are building momentum today`,
    `${count.toLocaleString()} users active right now`,
    `Join ${count.toLocaleString()} others on their journey`,
  ]
  if (mindsetName) {
    base.push(`${Math.floor(count * 0.3).toLocaleString()} ${mindsetName}s active today`)
  }
  return base
}

export function SocialProofBanner({ compact = false }: { compact?: boolean }) {
  const mindsetCtx = useMindsetOptional()
  const [messageIndex, setMessageIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  const now = new Date()
  const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  const count = useMemo(() => getActiveUserCount(dateSeed), [dateSeed])

  const mindsetName = mindsetCtx?.config ? MINDSET_CONFIGS[mindsetCtx.mindset]?.name || null : null
  const messages = useMemo(() => getMessages(count, mindsetName), [count, mindsetName])

  // Rotate messages every 10s with fade
  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setMessageIndex(prev => (prev + 1) % messages.length)
        setVisible(true)
      }, 300)
    }, 10000)
    return () => clearInterval(interval)
  }, [messages.length])

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
        </span>
        <p
          className={`text-[10px] text-emerald-400/90 font-medium transition-opacity duration-300 whitespace-nowrap ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {count.toLocaleString()} active
        </p>
      </div>
    )
  }

  return (
    <div className="mx-6 mb-4 flex items-center justify-center gap-2 py-2">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
      </span>
      <p
        className={`text-xs text-white/60 transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {messages[messageIndex]}
      </p>
    </div>
  )
}
