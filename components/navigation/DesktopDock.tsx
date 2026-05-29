'use client'

/* ============================================================================
   Desktop dock — a floating glass pill at the bottom of the viewport, only
   rendered at lg+ (1024px+). Replaces the earlier left-sidebar attempt: a
   sidebar reads as "productivity software" (Notion / Linear), which collides
   with Voxu's cinematic mental-OS identity. A floating dock keeps the canvas
   immersive and matches the same monochrome-glass language as MinimalNav
   (the mobile floating capsules) — so identity stays consistent across
   breakpoints, just scaled.

   Mobile is completely untouched: `hidden lg:flex` on the root, so phones
   never render this. MinimalNav stays mobile-only via `lg:hidden`.
   ============================================================================ */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, Bookmark, TrendingUp, Settings, Sparkles, Pause, Play, Users } from 'lucide-react'
import { useHomeAudioOptional } from '@/contexts/HomeAudioContext'
// Reset capsule removed (parked). The now-playing TEXT chip was also
// removed (duplicated BottomPlayerBar), but a minimal play/pause TOGGLE
// stays on the dock so audio can be paused from any page (BottomPlayerBar
// only mounts on home).

interface NavItem {
  href: string
  label: string
  icon: typeof Home
  matchPrefix?: boolean
}

// Coach removed — merged into Journal's Chat mode per user direction.
// The /coach route still exists but now redirects to /journal?mode=chat,
// and MessageCircle is no longer in the dock since the chat surface
// lives inside Journal.
const NAV: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/daily-guide', label: 'Daily Guide', icon: Sparkles, matchPrefix: true },
  { href: '/journal', label: 'Journal', icon: BookOpen, matchPrefix: true },
  { href: '/community', label: 'Community', icon: Users, matchPrefix: true },
  { href: '/saved', label: 'Saved', icon: Bookmark, matchPrefix: true },
  { href: '/progress', label: 'Progress', icon: TrendingUp, matchPrefix: true },
  { href: '/settings', label: 'Settings', icon: Settings, matchPrefix: true },
]

export function DesktopDock() {
  const pathname = usePathname()
  const homeAudio = useHomeAudioOptional()

  const isPlaying = homeAudio && (
    homeAudio.audioState.musicPlaying ||
    homeAudio.audioState.guideIsPlaying ||
    homeAudio.audioState.soundscapeIsPlaying
  )
  const hasActiveTrack = homeAudio && !!(
    homeAudio.audioState.backgroundMusic
    || homeAudio.audioState.guideLabel
    || homeAudio.audioState.activeSoundscape
  )

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!homeAudio) return
    const { audioState, dispatch, refs } = homeAudio
    if (isPlaying) {
      if (audioState.musicPlaying) dispatch({ type: 'PAUSE_MUSIC' })
      else if (audioState.guideIsPlaying && refs.guideAudioRef.current) {
        refs.guideAudioRef.current.pause()
        dispatch({ type: 'PAUSE_GUIDE' })
      } else if (audioState.soundscapeIsPlaying) dispatch({ type: 'PAUSE_SOUNDSCAPE' })
    } else {
      // Resume whichever channel has an active track.
      if (audioState.backgroundMusic) dispatch({ type: 'RESUME_MUSIC' })
      else if (audioState.guideLabel && refs.guideAudioRef.current) {
        refs.guideAudioRef.current.play().catch(() => {})
        dispatch({ type: 'RESUME_GUIDE' })
      } else if (audioState.activeSoundscape) dispatch({ type: 'RESUME_SOUNDSCAPE' })
    }
  }

  const isActive = (item: NavItem) => {
    if (item.href === '/') return pathname === '/'
    return item.matchPrefix ? pathname?.startsWith(item.href) : pathname === item.href
  }

  return (
    <div
      aria-label="Primary"
      role="navigation"
      className="hidden lg:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-40 items-center gap-2 pointer-events-none"
    >
      {/* Main dock — section nav + an optional play/pause toggle on the
          LEFT when audio is active. Icon-only with label-on-hover via the
          native `title` attribute. Active section gets a glowing pill. */}
      <nav
        aria-label="Sections"
        className="pointer-events-auto flex items-center gap-1 px-2 py-2 rounded-full bg-white/[0.05] backdrop-blur-xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
      >
        {/* Audio toggle — only mounts on non-home pages where the full
            BottomPlayerBar isn't rendering. On home, BottomPlayerBar
            sits to the LEFT of the dock and handles pause/play, so
            showing this here would duplicate it AND change dock width
            (breaking BottomPlayerBar's offset math). Pause/Play icon
            only — no track text. */}
        {hasActiveTrack && pathname !== '/' && (
          <button
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Resume'}
            aria-label={isPlaying ? 'Pause audio' : 'Resume audio'}
            className={`relative w-11 h-11 flex items-center justify-center rounded-full transition-all ${
              isPlaying
                ? 'bg-white text-black shadow-[0_0_18px_rgba(255,255,255,0.25)]'
                : 'bg-white/[0.10] text-white hover:bg-white/[0.18]'
            }`}
          >
            {isPlaying
              ? <Pause className="w-[14px] h-[14px]" fill="currentColor" />
              : <Play className="w-[14px] h-[14px] ml-0.5" fill="currentColor" />}
          </button>
        )}
        {NAV.map((item) => {
          const Icon = item.icon
          const active = isActive(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={`relative group w-11 h-11 flex items-center justify-center rounded-full transition-all ${
                active
                  ? 'bg-white/[0.14] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25),0_0_18px_rgba(255,255,255,0.18)]'
                  : 'text-white/55 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={1.6} />
              {/* Label peek on hover — small floating chip above the icon. */}
              <span
                aria-hidden
                className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/10 text-[10.5px] font-medium text-white/85 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
