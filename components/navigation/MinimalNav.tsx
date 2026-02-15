'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home } from 'lucide-react'

const PAGE_LABELS: Record<string, string> = {
  '/settings': 'Settings',
  '/journal': 'Journal',
  '/saved': 'Saved',
  '/coach': 'Coach',
  '/my-path': 'My Path',
  '/progress': 'Progress',
}

export function MinimalNav() {
  const pathname = usePathname()
  const pageLabel = PAGE_LABELS[pathname] || ''

  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-30 flex justify-center pb-6 pt-3 pointer-events-none">
      <Link
        href="/"
        aria-label={pageLabel ? `Home — currently on ${pageLabel}` : 'Home'}
        className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/15 hover:bg-white/15 backdrop-blur-sm transition-colors press-scale focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
      >
        <Home className="w-4 h-4 text-white/95" strokeWidth={1.5} aria-hidden="true" />
        {pageLabel && (
          <span className="text-sm text-white/95">{pageLabel}</span>
        )}
      </Link>
    </nav>
  )
}
