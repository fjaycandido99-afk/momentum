'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sun, Compass, Settings, Radio } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: 'Guide', icon: Sun },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/soundscape', label: 'Sounds', icon: Radio, featured: true },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#08080c]/98 backdrop-blur-xl border-t border-white/5 safe-area-pb">
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
                className={`flex flex-col items-center gap-1 px-4 py-1 transition-all ${
                  isActive ? 'scale-105' : ''
                }`}
              >
                <div className={`p-3 rounded-full transition-all ${
                  isActive
                    ? 'bg-white shadow-[0_0_20px_rgba(255,255,255,0.5),0_0_40px_rgba(255,255,255,0.2)] animate-glow-pulse'
                    : 'bg-white/10'
                }`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-black' : 'text-white'}`} />
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
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'text-white'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
