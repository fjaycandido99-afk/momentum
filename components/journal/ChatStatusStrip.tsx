'use client'

/**
 * The thin status line under the chat: how many messages are left today,
 * whether memory is on, and the paywall when the free allowance runs out.
 *
 * The paywall copy is the whole point of metering by depth rather than
 * just by count. "You've used your 5 for today" is a wall. "I've only got
 * today to go on" is an argument — and an honest one, because a free
 * user's memory really is one day deep. It states what the AI is missing,
 * not what the user failed to pay for.
 *
 * Nothing renders for a premium user with memory on — the good state
 * should be silent.
 */

import Link from 'next/link'
import { Sparkles, BookLock } from 'lucide-react'

export interface ChatQuota {
  remaining: number | null
  limit: number | null
}

interface Props {
  quota: ChatQuota | null
  /** null until the first reply tells us. */
  memoryConsented: boolean | null
  isPremium: boolean
  /** Set when the server refused the last send. */
  blocked: { reason?: 'locked' | 'exhausted'; limit: number | null } | null
  onUpgrade: () => void
}

export function ChatStatusStrip({ quota, memoryConsented, isPremium, blocked, onUpgrade }: Props) {
  if (blocked) {
    const exhausted = blocked.reason === 'exhausted'
    return (
      <div className="rounded-2xl border border-white/20 bg-white/[0.06] p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-white/70" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-white">
              {exhausted
                ? `That's your ${blocked.limit} messages for today`
                : 'This one needs Premium'}
            </p>
            <p className="text-xs leading-relaxed text-white/70">
              {exhausted
                ? 'They come back tomorrow. Premium removes the cap — and lets the chat read a month of your journal instead of just today, so it can notice what keeps coming up.'
                : 'Premium unlocks this, along with a chat that remembers what you have written and saved.'}
            </p>
          </div>
        </div>
        <button
          onClick={onUpgrade}
          className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90 press-scale"
        >
          See Premium
        </button>
      </div>
    )
  }

  const showCount = quota?.limit != null && quota.remaining != null
  const showMemoryNudge = memoryConsented === false

  if (!showCount && !showMemoryNudge) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
      {showCount ? (
        <p className="text-[11px] text-white/45">
          {quota!.remaining} of {quota!.limit} messages left today
        </p>
      ) : (
        <span />
      )}

      {showMemoryNudge && (
        <Link
          href="/settings#ai-memory"
          className="inline-flex items-center gap-1.5 text-[11px] text-white/55 underline-offset-2 transition-colors hover:text-white/80 hover:underline"
        >
          <BookLock className="h-3 w-3" />
          {isPremium
            ? 'Let it remember your journal'
            : 'Let it remember today’s entry'}
        </Link>
      )}
    </div>
  )
}
