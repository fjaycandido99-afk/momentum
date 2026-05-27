'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Bot, PenLine, BarChart3, Headphones, Bookmark, Compass, Sparkles, ChevronRight, Target } from 'lucide-react'

// Core capabilities worth surfacing. Deliberately the engaging destinations
// (not Settings) — this card's job is to teach breadth, not utility.
const FEATURES = [
  { icon: Bot, title: 'AI Coach', description: 'Personalized coaching and accountability check-ins', href: '/coach' },
  { icon: PenLine, title: 'Journal', description: 'Reflect daily — guided, free, dream & chat modes', href: '/journal' },
  { icon: Headphones, title: 'Soundscapes', description: 'Layer ambient sounds for deep focus and calm', href: '/' },
  { icon: BarChart3, title: 'Progress', description: 'Streaks, XP, achievements & your wellness score', href: '/progress' },
  { icon: Compass, title: 'Mindset Path', description: 'Explore your philosophy and its daily wisdom', href: '/mindset-selection' },
  { icon: Target, title: 'Goals', description: 'Set a goal and let AI break it into doable steps', href: '/progress' },
  { icon: Bookmark, title: 'Saved', description: 'Revisit your favorite quotes & reflections', href: '/saved' },
] as const

// Discover spotlight — surfaces ONE capability per app-open (picked fresh each
// open), deep-linking straight in. NO internal rotation on purpose: this lives
// inside the HeroCarousel, which already cycles slides on its own timer — a
// second rotating timer caused flicker + height jumps. The carousel does the
// cycling; this card stays static while it's on screen.
export function DailyFeatureTip() {
  const [index] = useState(() => Math.floor(Math.random() * FEATURES.length))
  const f = FEATURES[index]
  const Icon = f.icon

  return (
    <Link
      href={f.href}
      className="block h-full"
      aria-label={`Discover ${f.title}: ${f.description}`}
    >
      <div className="relative p-5 card-surface-lg h-full flex flex-col justify-between overflow-hidden">
        {/* Soft ambient glow — atmospheric depth, monochrome */}
        <div className="absolute -top-16 -right-10 w-40 h-40 rounded-full bg-white/[0.05] blur-3xl pointer-events-none" aria-hidden />

        <div className="relative">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-white/60" />
            <span className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">Discover</span>
          </div>

          <div className="mt-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/[0.08] border border-white/[0.1]">
                <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">{f.title}</h3>
            </div>
            <p className="text-sm text-white/70 mt-2 leading-snug">{f.description}</p>
          </div>
        </div>

        <div className="relative flex items-center justify-end mt-auto pt-3">
          <span className="inline-flex items-center gap-1 text-sm font-medium text-white">
            Try it <ChevronRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </Link>
  )
}
