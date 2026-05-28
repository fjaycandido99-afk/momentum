'use client'

/* ============================================================================
   Journal Right Rail — desktop-only sidebar that fills the empty space to
   the right of the centered journal column on a wide monitor. Surfaces the
   two pieces of context that matter when you're writing: how the streak
   is doing, and what you've written lately (tap to jump to that day).

   Fixed-position so it doesn't restructure the journal page (which is
   1500+ lines and risky to grid-wrap). Gated to xl: (1280px+) so there's
   genuine room beside the lg:max-w-3xl column without the two overlapping.
   Mobile / lg breakpoints below 1280 see nothing.
   ============================================================================ */

import { Flame, Trophy, BookOpen } from 'lucide-react'

interface JournalEntryLite {
  date: string
  journal_win?: string | null
  journal_gratitude?: string | null
  journal_intention?: string | null
  journal_freetext?: string | null
  journal_mood?: string | null
}

interface JournalRightRailProps {
  currentStreak: number
  longestStreak: number
  totalEntries: number
  recentEntries: JournalEntryLite[]
  /** When provided, tapping a recent entry jumps to that date in the picker. */
  onSelectEntry?: (date: string) => void
  /** Currently-selected date (so the active entry highlights). */
  selectedDate?: string
}

function formatDay(dateStr: string): string {
  // YYYY-MM-DD → "Mon, May 28". Parse as local so the day doesn't shift.
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return dateStr
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function previewOf(entry: JournalEntryLite): string {
  const text = entry.journal_win
    || entry.journal_freetext
    || entry.journal_intention
    || entry.journal_gratitude
    || ''
  return text.trim().slice(0, 90)
}

export function JournalRightRail({
  currentStreak,
  longestStreak,
  totalEntries,
  recentEntries,
  onSelectEntry,
  selectedDate,
}: JournalRightRailProps) {
  const top = recentEntries.slice(0, 6)

  return (
    <aside
      aria-label="Journal sidebar"
      // xl: only — at lg (1024–1280) the journal column already takes most
      // of the available width, no room for the rail without overlap.
      // top-28 clears the sticky header; max-h + overflow-y keeps the rail
      // self-contained when there are many entries.
      className="hidden xl:flex flex-col gap-3 fixed right-8 top-28 w-72 max-h-[calc(100vh-9rem)] overflow-y-auto scrollbar-hide z-20"
    >
      {/* Streak card */}
      <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45 mb-3">Streak</h3>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-4xl font-bold text-white leading-none">{currentStreak}</span>
          <span className="text-xs text-white/55">day{currentStreak === 1 ? '' : 's'}</span>
          <Flame className="w-4 h-4 text-white/80 ml-auto" strokeWidth={1.8} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-white/55">
            <Trophy className="w-3 h-3 text-white/55" strokeWidth={1.8} />
            <span>Best: <span className="text-white font-medium">{longestStreak}</span></span>
          </div>
          <div className="flex items-center gap-1.5 text-white/55">
            <BookOpen className="w-3 h-3 text-white/55" strokeWidth={1.8} />
            <span>Total: <span className="text-white font-medium">{totalEntries}</span></span>
          </div>
        </div>
      </div>

      {/* Recent entries */}
      {top.length > 0 && (
        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45 mb-3">Recent</h3>
          <ul className="space-y-1">
            {top.map(entry => {
              const preview = previewOf(entry)
              const isSelected = selectedDate === entry.date
              return (
                <li key={entry.date}>
                  <button
                    onClick={() => onSelectEntry?.(entry.date)}
                    className={`w-full text-left p-2.5 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-white/[0.10] text-white'
                        : 'hover:bg-white/[0.05] text-white/80'
                    }`}
                  >
                    <div className="text-[10px] text-white/50 uppercase tracking-wide">
                      {formatDay(entry.date)}
                    </div>
                    <div className={`text-xs leading-snug mt-0.5 line-clamp-2 ${preview ? '' : 'italic text-white/40'}`}>
                      {preview || 'Mood-only entry'}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </aside>
  )
}
