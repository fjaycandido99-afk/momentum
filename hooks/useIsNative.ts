'use client'

import { useEffect, useState } from 'react'

/**
 * Whether we are running inside the Capacitor shell rather than a browser.
 *
 * Returns false on the first render every time, including in the native
 * app, because the server has no idea which one it is rendering for and a
 * mismatch would be a hydration error. Anything gated on this must be
 * safe to show for one frame, or must render nothing until it settles.
 */
export function useIsNative(): boolean {
  const [isNative, setIsNative] = useState(false)

  useEffect(() => {
    try {
      const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
      setIsNative(!!cap?.isNativePlatform?.())
    } catch {
      setIsNative(false)
    }
  }, [])

  return isNative
}
