'use client'

/* ============================================================================
   Desktop sidebar — only rendered at lg+ (1024px+). The mobile experience is
   completely untouched: this component is `hidden lg:flex` so it doesn't even
   exist in the DOM on a phone, and MinimalNav (the floating capsules) gets
   `lg:hidden` so the desktop and mobile chrome never collide.

   Why a sidebar on desktop: the mobile design uses floating Home + Reset
   capsules because tapping is the primary input and the screen is small. On
   a MacBook the same UI feels like "phone stretched to fullscreen" — pointer
   users expect a persistent nav. The sidebar gives every section one click
   away, mirrors the audio chip from MinimalNav, and keeps the same Reset
   affordance.
   ============================================================================ */

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Home, BookOpen, MessageCircle, Bookmark, TrendingUp, Settings, Pause, Wind, Sparkles } from 'lucide-react'
import { EqBars } from '@/components/ui/EqBars'
import { useReset } from '@/contexts/ResetContext'
import { useHomeAudioOptional } from '@/contexts/HomeAudioContext'

interface NavItem {
  href: string
  label: string
  icon: typeof Home
  /** Match this path AND any subpath beneath it. */
  matchPrefix?: boolean
}

const NAV: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/daily-guide', label: 'Daily Guide', icon: Sparkles, matchPrefix: true },
  { href: '/coach', label: 'Coach', icon: MessageCircle, matchPrefix: true },
  { href: '/journal', label: 'Journal', icon: BookOpen, matchPrefix: true },
  { href: '/saved', label: 'Saved', icon: Bookmark, matchPrefix: true },
  { href: '/progress', label: 'Progress', icon: TrendingUp, matchPrefix: true },
  { href: '/settings', label: 'Settings', icon: Settings, matchPrefix: true },
]

export function DesktopSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { openReset } = useReset()
  const homeAudio = useHomeAudioOptional()

  const isPlaying = homeAudio && (
    homeAudio.audioState.musicPlaying ||
    homeAudio.audioState.guideIsPlaying ||
    homeAudio.audioState.soundscapeIsPlaying
  )
  const nowPlayingLabel = homeAudio ? (
    homeAudio.audioState.backgroundMusic?.label
    || homeAudio.audioState.guideLabel
    || homeAudio.audioState.activeSoundscape?.label
    || ''
  ) : ''

  const handlePause = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!homeAudio) return
    const { audioState, dispatch, refs } = homeAudio
    if (audioState.musicPlaying) {
      dispatch({ type: 'PAUSE_MUSIC' })
    } else if (audioState.guideIsPlaying && refs.guideAudioRef.current) {
      refs.guideAudioRef.current.pause()
      dispatch({ type: 'PAUSE_GUIDE' })
    } else if (audioState.soundscapeIsPlaying) {
      dispatch({ type: 'PAUSE_SOUNDSCAPE' })
    }
  }

  const isActive = (item: NavItem) => {
    if (item.href === '/') return pathname === '/'
    return item.matchPrefix ? pathname?.startsWith(item.href) : pathname === item.href
  }

  return (
    <aside
      aria-label="Primary"
      className="hidden lg:flex fixed left-0 top-0 bottom-0 z-30 w-60 flex-col bg-black/40 backdrop-blur-xl border-r border-white/[0.06]"
    >
      {/* Wordmark */}
      <div className="px-6 pt-8 pb-10">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          {/* Aura dot — tiny echo of the AuraRing/AIOrb */}
          <span
            aria-hidden
            className="relative inline-block w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]"
          />
          <span className="text-xl font-semibold tracking-tight text-white group-hover:text-white">Voxu</span>
        </Link>
      </div>

      {/* Sections */}
      <nav aria-label="Sections" className="flex-1 px-3 space-y-0.5">
        {NAV.map((item) => {
          const Icon = item.icon
          const active = isActive(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                active
                  ? 'bg-white/[0.08] text-white'
                  : 'text-white/55 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {/* Active indicator — a thin bar that's always in the layout so
                  the row width doesn't shift when toggling */}
              <span
                aria-hidden
                className={`block w-0.5 h-5 rounded-full ${active ? 'bg-white' : 'bg-transparent'}`}
              />
              <Icon className={`w-[18px] h-[18px] ${active ? 'text-white' : 'text-white/55 group-hover:text-white'}`} strokeWidth={1.6} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer cluster — now-playing chip + Reset */}
      <div className="p-3 pb-6 space-y-2">
        {isPlaying && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => router.push('/')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push('/') } }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 hover:bg-white/[0.10] transition-colors cursor-pointer"
            aria-label={`Now playing: ${nowPlayingLabel || 'audio'}`}
          >
            <EqBars height={14} barWidth={2} gap={2} color="rgba(255,255,255,0.8)" />
            <span className="flex-1 text-xs text-white/75 truncate">{nowPlayingLabel || 'Playing'}</span>
            <button
              aria-label="Pause"
              onClick={handlePause}
              className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            >
              <Pause className="w-3 h-3 text-white/80" fill="white" fillOpacity={0.8} />
            </button>
          </div>
        )}

        <button
          onClick={openReset}
          aria-label="Reset — a calm grounding moment"
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 text-white text-sm transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
        >
          <Wind className="w-[18px] h-[18px] text-white" strokeWidth={1.6} aria-hidden />
          <span>Reset</span>
        </button>
      </div>
    </aside>
  )
}
