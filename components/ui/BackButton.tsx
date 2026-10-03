'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

/**
 * Back to wherever they came from — the menu, Today, Progress — and to
 * `fallback` when there is nowhere to go back to (opened from a push, a
 * widget tap, a shared link). A hard-coded href sent people somewhere they
 * had never been; router.back() alone did nothing on a cold open.
 */
export function BackButton({ fallback = '/', label = 'Back' }: { fallback?: string; label?: string }) {
  const router = useRouter()
  return (
    <button
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      aria-label={label}
      className="tap-44 inline-flex p-2 -ml-2 rounded-full hover:bg-white/10"
    >
      <ChevronLeft className="w-5 h-5 text-white/80" />
    </button>
  )
}
