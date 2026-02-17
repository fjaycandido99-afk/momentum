'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Target, Check, PenLine } from 'lucide-react'
import { mutate } from 'swr'
import { logXPEventServer } from '@/lib/gamification'
import { useToast } from '@/contexts/ToastContext'

const QUICK_PICKS = [
  'Stay focused & present',
  'Move my body',
  'Be kind to myself',
  'Make progress on my goal',
]

interface DailyIntentionCardProps {
  dailyIntention: string | null
  today: string
}

export function DailyIntentionCard({ dailyIntention, today }: DailyIntentionCardProps) {
  const [customText, setCustomText] = useState('')
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  const handleSetIntention = async (intention: string) => {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/daily-guide/intention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intention }),
      })
      if (res.ok) {
        mutate(`/api/daily-guide/journal?date=${today}`)
        const xpResult = await logXPEventServer('dailyIntention')
        if (xpResult) {
          showToast({ message: `+5 XP — Intention set!`, type: 'success' })
        }
      }
    } catch {
      // Silently fail
    } finally {
      setSaving(false)
    }
  }

  // Already set — show confirmation
  if (dailyIntention) {
    return (
      <div className="mx-6 mb-4 p-4 rounded-2xl bg-black border border-white/15">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-emerald-500/20">
            <Check className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/85 mb-1">Today's intention</p>
            <p className="text-sm text-white leading-relaxed">{dailyIntention}</p>
            <Link
              href="/journal"
              className="inline-flex items-center gap-1.5 mt-2 text-xs text-white/85 hover:text-white transition-colors"
            >
              <PenLine className="w-3 h-3" />
              Reflect in journal
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Not set — show picker
  return (
    <div className="mx-6 mb-4 p-4 rounded-2xl bg-black border border-white/15">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-white" />
        <p className="text-sm font-medium text-white">What's your focus today?</p>
      </div>

      {/* Quick picks */}
      <div className="flex flex-wrap gap-2 mb-3">
        {QUICK_PICKS.map((pick) => (
          <button
            key={pick}
            onClick={() => handleSetIntention(pick)}
            disabled={saving}
            className="px-3 py-1.5 text-xs text-white rounded-full bg-white/10 border border-white/15 hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            {pick}
          </button>
        ))}
      </div>

      {/* Custom input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && customText.trim()) handleSetIntention(customText.trim())
          }}
          placeholder="Or type your own..."
          maxLength={100}
          className="flex-1 px-3 py-2 text-xs text-white bg-white/5 border border-white/15 rounded-xl placeholder:text-white/60 focus:outline-none focus:border-white/30"
        />
        {customText.trim() && (
          <button
            onClick={() => handleSetIntention(customText.trim())}
            disabled={saving}
            className="px-3 py-2 text-xs font-medium text-white bg-white/10 rounded-xl hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            Set
          </button>
        )}
      </div>
    </div>
  )
}
