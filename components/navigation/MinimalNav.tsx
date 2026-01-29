'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home } from 'lucide-react'

const PAGE_LABELS: Record<string, string> = {
  '/settings': 'Settings',
  '/discover': 'Discover',
  '/journal': 'Journal',
  '/soundscape': 'Soundscape',
  '/saved': 'Saved',
  '/coach': 'Coach',
}

export function MinimalNav() {
  const pathname = usePathname()
  const pageLabel = PAGE_LABELS[pathname] || ''

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex justify-center pb-6 pt-3 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
      <Link
        href="/"
        className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/15 hover:bg-white/15 backdrop-blur-sm transition-colors press-scale"
      >
        <Home className="w-4 h-4 text-white/80" strokeWidth={1.5} />
        {pageLabel && (
          <span className="text-sm text-white/80">{pageLabel}</span>
        )}
      </Link>
    </nav>
  )
}
