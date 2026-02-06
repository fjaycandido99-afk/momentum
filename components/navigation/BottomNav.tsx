'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sun, Settings, PenLine, Sparkles } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: 'Guide', icon: Sun },
  { href: '/astrology', label: 'Cosmic', icon: Sparkles },
  { href: '/journal', label: 'Journal', icon: PenLine },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-2xl border-t border-white/5 safe-area-pb">
      <div className="flex items-center justify-around py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all duration-200 press-scale focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none ${
                isActive
                  ? 'text-white'
                  : 'text-white/95 hover:text-white/95'
              }`}
            >
              <Icon className="w-5 h-5 transition-all duration-200" strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-[10px]">{item.label}</span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-white mt-0.5" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
