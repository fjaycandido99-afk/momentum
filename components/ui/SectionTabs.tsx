'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Pairs of screens that answer the same question, joined under one menu
 * entry (components/home/NavSheet): each screen keeps its own page and URL,
 * and this switch sits at the top of both.
 *
 * Capped at the content column's width (max-w-lg), so on iPad it lines up
 * with the pages that center their content and never stretches across the
 * whole screen on the ones (Progress, Daily Read) that don't.
 *
 * `replace`, so flipping between tabs never stacks history — Back still
 * leaves the section in one tap.
 */
export const SECTION_TABS = {
  you: [
    { href: '/profile', label: 'You' },
    { href: '/progress', label: 'Progress' },
  ],
  record: [
    { href: '/proof', label: 'Proof' },
    { href: '/patterns', label: 'Laws' },
  ],
  learn: [
    { href: '/daily-read', label: 'Daily Read' },
    { href: '/psychology', label: 'Psychology' },
  ],
} as const

export type SectionKey = keyof typeof SECTION_TABS

export function SectionTabs({ section, className = '' }: { section: SectionKey; className?: string }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Section" className={`flex w-full max-w-lg mx-auto p-1 rounded-full bg-white/[0.07] border border-white/[0.12] ${className}`}>
      {SECTION_TABS[section].map(t => {
        const on = pathname === t.href
        return (
          <Link
            key={t.href}
            href={t.href}
            replace
            aria-current={on ? 'page' : undefined}
            className={`flex-1 text-center py-2 rounded-full text-px-13 transition-colors ${
              on ? 'bg-white text-black font-medium' : 'text-white/75 hover:text-white'
            }`}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
