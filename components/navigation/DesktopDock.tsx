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
import { Home, BookOpen, MessageCircle, Bookmark, TrendingUp, Settings, Sparkles } from 'lucide-react'
// Reset + now-playing chip removed from the desktop dock — the chip
// duplicated BottomPlayerBar (which is now positioned beside the dock),
// and Reset is parked for now per user request.

interface NavItem {
  href: string
  label: string
  icon: typeof Home
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

export function DesktopDock() {
  const pathname = usePathname()

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
      {/* Main dock — section nav. Icon-only with label-on-hover via the
          native `title` attribute (clean + accessible; no custom tooltip
          system to maintain). Active section gets a glowing pill ring. */}
      <nav
        aria-label="Sections"
        className="pointer-events-auto flex items-center gap-1 px-2 py-2 rounded-full bg-white/[0.05] backdrop-blur-xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
      >
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
