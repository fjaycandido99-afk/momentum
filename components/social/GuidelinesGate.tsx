'use client'

/* ============================================================================
   GuidelinesGate — wraps any "share to community" action so it pops a
   one-time Community Guidelines acceptance modal before letting the
   action through. Once accepted (recorded server-side), all future
   shares from any surface skip the modal.

   Usage:
     const gate = useGuidelinesGate()
     const onSubmit = () => gate.run(async () => { await postToCommunity() })

   Renders nothing inline — host the <gate.Modal /> element somewhere
   stable in the layout (e.g. the community page or share button host).
   ============================================================================ */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { X, Loader2, Check } from 'lucide-react'

interface GateApi {
  /** Run `action` only after guidelines are accepted (no-op otherwise). */
  run: (action: () => void | Promise<void>) => Promise<void>
  /** Mount this once anywhere in the tree to render the modal. */
  Modal: React.FC
}

export function useGuidelinesGate(): GateApi {
  const [open, setOpen] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState<boolean | null>(null)
  const pendingActionRef = useRef<(() => void | Promise<void>) | null>(null)

  // Probe acceptance once on mount so the modal doesn't flash for
  // returning users who already accepted.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/social/guidelines')
        if (cancelled) return
        if (r.ok) {
          const d = await r.json()
          setAccepted(!!d.accepted)
        } else {
          setAccepted(false)
        }
      } catch {
        if (!cancelled) setAccepted(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const run = useCallback(async (action: () => void | Promise<void>) => {
    if (accepted) {
      await action()
      return
    }
    pendingActionRef.current = action
    setOpen(true)
  }, [accepted])

  const accept = async () => {
    setAccepting(true)
    try {
      const r = await fetch('/api/social/guidelines', { method: 'POST' })
      if (r.ok) {
        setAccepted(true)
        setOpen(false)
        const next = pendingActionRef.current
        pendingActionRef.current = null
        if (next) await next()
      }
    } finally {
      setAccepting(false)
    }
  }

  const Modal: React.FC = () => {
    if (!open || typeof document === 'undefined') return null
    return createPortal(
      <div role="dialog" aria-modal="true" aria-label="Community Guidelines" className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
        <button aria-label="Close" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/75 backdrop-blur-md cursor-default" />
        <div className="relative w-full max-w-md p-5 rounded-2xl bg-black border border-white/15 shadow-2xl animate-fade-in-up">
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] grid place-items-center"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
          <h2 className="text-lg font-semibold text-white pr-8 mb-2">Before you share…</h2>
          <p className="text-sm text-white/80 leading-relaxed mb-3">
            Voxu Community is a place to share reflections from your inner life and be witnessed by other people doing the same.
          </p>
          <ul className="space-y-2 mb-4">
            <li className="text-sm text-white/85 leading-relaxed"><span className="text-white/55 mr-1.5">❤️</span> Share what&apos;s real. Half-truths help no one.</li>
            <li className="text-sm text-white/85 leading-relaxed"><span className="text-white/55 mr-1.5">🪞</span> Reactions are solidarity, not approval.</li>
            <li className="text-sm text-white/85 leading-relaxed"><span className="text-white/55 mr-1.5">🤝</span> No advice unless asked.</li>
            <li className="text-sm text-white/85 leading-relaxed"><span className="text-white/55 mr-1.5">🛡️</span> Crisis content is auto-flagged for human review.</li>
            <li className="text-sm text-white/85 leading-relaxed"><span className="text-white/55 mr-1.5">🚫</span> No abuse, doxxing, spam, or self-harm glorification.</li>
          </ul>
          <p className="text-[12.5px] text-white/55 leading-relaxed mb-4">
            <Link href="/community/guidelines" className="underline hover:text-white">Read the full guidelines</Link> · Crisis lines are listed at the bottom.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-xs text-white/85"
            >
              Cancel
            </button>
            <button
              onClick={() => void accept()}
              disabled={accepting}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-white text-black text-xs font-semibold disabled:opacity-40 hover:bg-white/95"
            >
              {accepting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              I agree, continue
            </button>
          </div>
        </div>
      </div>,
      document.body,
    )
  }

  return { run, Modal }
}
