'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sun, Compass, Settings, Radio, PenLine } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: 'Guide', icon: Sun },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/soundscape', label: 'Sounds', icon: Radio, featured: true },
  { href: '/journal', label: 'Journal', icon: PenLine },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#08080c]/90 backdrop-blur-2xl border-t border-white/5 safe-area-pb">
      <div className="flex items-center justify-around py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          // Featured button (Sounds) - center highlighted button
          if (item.featured) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-2 py-1 transition-all press-scale ${
                  isActive ? 'scale-105' : ''
                }`}
              >
                <div className={`p-3 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-white shadow-[0_0_20px_rgba(255,255,255,0.5),0_0_40px_rgba(255,255,255,0.2)] animate-glow-pulse'
                    : 'bg-white/10'
                }`}>
                  <Icon className={`w-5 h-5 transition-all duration-200 ${isActive ? 'text-black' : 'text-white'}`} />
                </div>
                <span className={`text-[10px] ${isActive ? 'text-white' : 'text-white/60'}`}>
                  {item.label}
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all duration-200 press-scale ${
                isActive
                  ? 'text-white'
                  : 'text-white/60 hover:text-white/80'
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
