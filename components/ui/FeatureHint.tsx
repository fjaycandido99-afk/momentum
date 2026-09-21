'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { isDismissed, setDismissed } from '@/lib/ui/dismiss'

interface FeatureHintProps {
  id: string
  text: string
  /**
   * 'once' — a teaching line that goes away for good once it's been seen.
   * 'persistent' — a standing note. Still dismissible: a line that can never
   * be turned off is furniture, and there are thirteen of these in the app.
   */
  mode: 'once' | 'persistent'
}

/**
 * The one-line hint under a section title.
 *
 * It used to fade out after eight seconds and mark itself seen, with no
 * control at all — so it counted as read whether or not anyone read it, and
 * 'persistent' hints could never be turned off by anybody. Now there's an X,
 * a dismissal that sticks (through the shared store), and the auto-fade is
 * visual only: a hint nobody dismissed still comes back tomorrow, which is
 * what "seen" should mean for a line that was on screen for 8 seconds.
 */
export function FeatureHint({ id, text, mode }: FeatureHintProps) {
  const [visible, setVisible] = useState(false)
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    if (isDismissed(`hint-${id}`)) return

    setVisible(true)
    const fadeIn = setTimeout(() => setOpacity(1), 50)
    if (mode === 'persistent') return () => clearTimeout(fadeIn)

    // Fades out of the way, but is not marked as dismissed: it will be back
    // tomorrow unless the X was tapped.
    const fadeOut = setTimeout(() => {
      setOpacity(0)
      setTimeout(() => setVisible(false), 1000)
    }, 8000)

    return () => {
      clearTimeout(fadeIn)
      clearTimeout(fadeOut)
    }
  }, [id, mode])

  if (!visible) return null

  return (
    <div
      className="flex items-start gap-1.5 mt-1.5 transition-opacity duration-1000"
      style={{ opacity }}
    >
      <p
        className={`text-[11px] leading-relaxed italic tracking-wide ${
          mode === 'persistent' ? 'text-white/25' : 'text-white/45'
        }`}
      >
        {text}
      </p>
      <button
        onClick={() => { setDismissed(`hint-${id}`, 'forever'); setVisible(false) }}
        aria-label="Hide this tip"
        className="shrink-0 p-0.5 -mt-0.5 rounded-full text-white/25 hover:text-white/60 hover:bg-white/10"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}
