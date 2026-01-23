'use client'

import { useState } from 'react'
import { PenLine } from 'lucide-react'
import { JournalEntry } from './JournalEntry'

export function FloatingJournalButton() {
  const [showJournal, setShowJournal] = useState(false)

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-28 right-6 z-40">
        <button
          onClick={() => setShowJournal(true)}
          className="
            relative group flex items-center gap-2 px-4 py-2.5 rounded-2xl
            bg-white/[0.04] border border-white/[0.08]
            hover:bg-white/[0.06] hover:border-white/[0.12]
            active:scale-95 transition-all duration-200
            shadow-lg shadow-white/5
          "
        >
          {/* Pulse animation on idle */}
          <span className="absolute inset-0 rounded-2xl bg-amber-500/10 animate-breathe opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="relative flex items-center gap-2">
            <PenLine className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-white/90">
              Journal
            </span>
          </div>
        </button>
      </div>

      {/* Journal Modal */}
      {showJournal && (
        <JournalEntry
          showAsModal={true}
          onClose={() => setShowJournal(false)}
        />
      )}
    </>
  )
}
