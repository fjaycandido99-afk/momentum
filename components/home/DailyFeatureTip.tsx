'use client'

import Link from 'next/link'
import { Timer, Bot, PenLine, BarChart3, Headphones, Bookmark, Compass, Music, Settings, Share2, ChevronRight } from 'lucide-react'

const TIPS = [
  { icon: Timer, title: 'Focus Timer', description: 'Deep work with Pomodoro sessions + ambient sounds', href: '/focus', accent: 'bg-orange-400/20 text-orange-300' },
  { icon: Bot, title: 'AI Coach', description: 'Get personalized coaching and accountability check-ins', href: '/coach', accent: 'bg-violet-400/20 text-violet-300' },
  { icon: PenLine, title: 'Journal', description: 'Reflect daily with guided, free, dream & chat modes', href: '/journal', accent: 'bg-emerald-400/20 text-emerald-300' },
  { icon: BarChart3, title: 'Progress', description: 'Track your streaks, XP, achievements & wellness score', href: '/progress', accent: 'bg-sky-400/20 text-sky-300' },
  { icon: Headphones, title: 'Soundscapes', description: 'Layer ambient sounds for focus and relaxation', href: '/focus', accent: 'bg-teal-400/20 text-teal-300' },
  { icon: Bookmark, title: 'Saved Content', description: 'Revisit your saved quotes, reflections & favorites', href: '/saved', accent: 'bg-amber-400/20 text-amber-300' },
  { icon: Compass, title: 'Mindset Path', description: 'Explore your philosophical mindset and its wisdom', href: '/mindset-selection', accent: 'bg-rose-400/20 text-rose-300' },
  { icon: Music, title: 'Music Genres', description: 'Discover lo-fi, classical, jazz & more for any mood', href: null, accent: 'bg-pink-400/20 text-pink-300' },
  { icon: Settings, title: 'Settings', description: 'Customize your schedule, tone, and daily flow', href: '/settings', accent: 'bg-slate-400/20 text-slate-300' },
  { icon: Share2, title: 'Share', description: 'Share your streaks and quotes as images on social media', href: null, accent: 'bg-cyan-400/20 text-cyan-300' },
] as const

function hashCode(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function getTodaysTip() {
  const index = hashCode(new Date().toDateString()) % TIPS.length
  return TIPS[index]
}

export function DailyFeatureTip() {
  const tip = getTodaysTip()
  const Icon = tip.icon
  const [iconColor, textColor] = tip.accent.split(' ')

  const content = (
    <div className="p-5 rounded-2xl border border-white/[0.15] bg-black h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-7 h-7 rounded-full ${iconColor}`}>
            <Icon className={`w-3.5 h-3.5 ${textColor}`} />
          </div>
          <span className="text-[10px] uppercase tracking-wider text-white/50 font-medium">Daily Tip</span>
        </div>
        <h3 className="text-lg font-semibold text-white mt-2.5">{tip.title}</h3>
        <p className="text-sm text-white/70 mt-0.5 leading-snug">{tip.description}</p>
      </div>
      <div className="flex items-center justify-between mt-auto pt-2">
        <span className={`text-sm font-medium ${textColor}`}>Try it</span>
        <ChevronRight className={`w-4 h-4 ${textColor}`} />
      </div>
    </div>
  )

  if (tip.href) {
    return <Link href={tip.href} className="block h-full">{content}</Link>
  }

  return <div className="h-full">{content}</div>
}
