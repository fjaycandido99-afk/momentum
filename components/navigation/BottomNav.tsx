'use client'

import { useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sun, Settings, PenLine } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: 'Guide', icon: Sun },
  { href: '/journal', label: 'Journal', icon: PenLine },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()
  const prevPathRef = useRef(pathname)
  const pillKeyRef = useRef(0)

  // Increment key on route change to re-trigger pill animation
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname
      pillKeyRef.current += 1
    }
  }, [pathname])

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
              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all duration-200 nav-tap-spring focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none ${
                isActive
                  ? 'text-white'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              <Icon className="w-5 h-5 transition-all duration-200" strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-[10px]">{item.label}</span>
              {isActive && (
                <div
                  key={`pill-${pillKeyRef.current}`}
                  className="w-6 h-1 rounded-full bg-white mt-0.5 nav-pill-active"
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
