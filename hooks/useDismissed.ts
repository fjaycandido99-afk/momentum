'use client'

import { useCallback, useEffect, useState } from 'react'
import { isDismissed, setDismissed } from '@/lib/ui/dismiss'

/**
 * "Has this been dismissed, and how do I dismiss it?"
 *
 * Reads storage in an effect rather than during render: reading it on the
 * server would crash, and reading it in the first client render would
 * mismatch what the server produced. So the card renders, then hides on the
 * same tick — which is also why `ready` exists for anything that would
 * flash.
 */
export function useDismissed(id: string): {
  hidden: boolean
  ready: boolean
  dismissForever: () => void
  dismissForToday: () => void
} {
  const [hidden, setHidden] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setHidden(isDismissed(id))
    setReady(true)
  }, [id])

  const dismissForever = useCallback(() => {
    setDismissed(id, 'forever')
    setHidden(true)
  }, [id])

  const dismissForToday = useCallback(() => {
    setDismissed(id, 'today')
    setHidden(true)
  }, [id])

  return { hidden, ready, dismissForever, dismissForToday }
}
