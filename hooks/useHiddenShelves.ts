'use client'

import { useCallback, useEffect, useState } from 'react'
import { readHidden, toggleShelf, writeHidden } from '@/lib/ui/shelves'

/**
 * Which shelves are hidden, and how to change that.
 *
 * Read in an effect, like every other stored preference here: reading
 * localStorage during render breaks on the server and mismatches on the
 * client. `ready` says whether the answer is real yet, so home can hold the
 * shelves back for one tick rather than showing something someone hid.
 */
export function useHiddenShelves(): {
  hidden: string[]
  ready: boolean
  isHidden: (id: string) => boolean
  toggle: (id: string) => void
} {
  const [hidden, setHidden] = useState<string[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setHidden(readHidden())
    setReady(true)
  }, [])

  const toggle = useCallback((id: string) => {
    setHidden(prev => {
      const next = toggleShelf(prev, id)
      writeHidden(next)
      return next
    })
  }, [])

  const isHidden = useCallback((id: string) => hidden.includes(id), [hidden])

  return { hidden, ready, isHidden, toggle }
}
