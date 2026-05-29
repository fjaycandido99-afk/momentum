'use client'

/* ============================================================================
   ShareToCommunityButton — opt-in share of a saved journal entry to the
   public Community feed. Default-private; user must explicitly click + can
   choose anonymous before sharing.

   Lives in the journal page below the saved entry's stats row. Once shared,
   stays "Shared" with a link to the post so the user can revisit / delete.
   ============================================================================ */

import { useState } from 'react'
import { Share2, Loader2, EyeOff, Check, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface Props {
  /** Pre-filled body. The editor lets the user trim before posting. */
  body: string
  /** Optional ID of the journal entry being shared — surfaces the
   *  "Shared journal entry" badge + mindset chip on the post. */
  sourceEntryId?: string | null
  /** Optional mindset tag — shown alongside the badge so readers see
   *  what frame the reflection came from. */
  mindsetId?: string | null
}

export function ShareToCommunityButton({ body, sourceEntryId, mindsetId }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(body)
  const [anonymous, setAnonymous] = useState(false)
  const [posting, setPosting] = useState(false)
  const [posted, setPosted] = useState<{ id: string } | null>(null)

  const submit = async () => {
    const trimmed = draft.trim()
    if (!trimmed || posting) return
    setPosting(true)
    try {
      const res = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: trimmed,
          anonymous,
          sourceEntryId: sourceEntryId || undefined,
          mindsetId: mindsetId || undefined,
        }),
      })
      if (!res.ok) throw new Error('share failed')
      const data = await res.json()
      setPosted({ id: data.post.id })
      setOpen(false)
    } catch (err) {
      console.error('[share] failed:', err)
    } finally {
      setPosting(false)
    }
  }

  // After-shared receipt
  if (posted) {
    return (
      <div className="mt-1 p-3 rounded-xl bg-white/[0.05] border border-white/[0.10] flex items-center gap-2">
        <Check className="w-4 h-4 text-white/80 shrink-0" />
        <span className="text-sm text-white/85">Shared to Community.</span>
        <Link
          href="/community"
          className="ml-auto inline-flex items-center gap-1 text-xs text-white/70 hover:text-white"
        >
          View <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    )
  }

  // Editor (open)
  if (open) {
    return (
      <div className="mt-1 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.10]">
        <p className="text-[11px] uppercase tracking-wider text-white/55 mb-2">Share to Community</p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          maxLength={1200}
          className="w-full bg-transparent text-[14px] text-white placeholder-white/40 caret-white focus:outline-none resize-none"
          placeholder="Edit your share…"
        />
        <div className="mt-2 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="accent-white"
            />
            <EyeOff className="w-3.5 h-3.5" />
            Anonymously
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-xs text-white/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!draft.trim() || posting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-black text-xs font-semibold disabled:opacity-40 hover:bg-white/95 transition-colors press-scale"
            >
              {posting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}
              Share
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Default collapsed button
  return (
    <button
      onClick={() => { setDraft(body); setOpen(true) }}
      className="mt-1 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs text-white/70 hover:text-white/95 transition-colors press-scale"
    >
      <Share2 className="w-3.5 h-3.5" />
      Share this to Community (private by default)
    </button>
  )
}
