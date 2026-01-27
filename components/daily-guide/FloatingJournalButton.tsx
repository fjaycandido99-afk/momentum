'use client'

import { MessageSquare } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'

export function FloatingJournalButton() {
  const router = useRouter()
  const pathname = usePathname()

  // Hide on the coach page itself
  if (pathname?.startsWith('/coach')) return null

  return (
    <div className="fixed bottom-28 right-6 z-40">
      <button
        onClick={() => router.push('/coach')}
        className="
          relative group flex items-center gap-2 p-2.5 rounded-2xl
          bg-white/[0.04] border border-white/[0.08]
          hover:bg-white/[0.06] hover:border-white/[0.12]
          active:scale-95 transition-all duration-200
          shadow-lg shadow-white/5
        "
      >
        <MessageSquare className="w-4 h-4 text-amber-400" />
      </button>
    </div>
  )
}
