'use client'

import { useEffect, useState } from 'react'
import { isQuiet, setQuiet } from '@/lib/ui/dismiss'

/**
 * "I've read this — don't show it again until it changes."
 *
 * Returns whether to hide the block, and the function that hides it. The
 * signal is whatever means "there is news here": an earned count, a member
 * count. When it differs from the value that was dismissed, the block comes
 * back by itself.
 *
 * Starts visible and settles after mount, deliberately: reading storage
 * during render would differ between server and client, and a block that
 * flashes in is better than one that flashes out.
 */
export function useQuiet(id: string, signal: string): { hidden: boolean; hide: () => void } {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    setHidden(isQuiet(id, signal))
  }, [id, signal])

  return {
    hidden,
    hide: () => {
      setQuiet(id, signal)
      setHidden(true)
    },
  }
}
