'use client'

import { useEffect, useRef } from 'react'

/**
 * Lighting up one part of a screen (data-voxu-spot), for Voxu Guide: while a
 * line names it, and on arrival when a "take me to…" carried ?spot=….
 */

const SPOT_CLASS = 'voxu-spot'

export function spotlight(spot: string | undefined) {
  document.querySelectorAll(`.${SPOT_CLASS}`).forEach(el => el.classList.remove(SPOT_CLASS))
  if (!spot) return
  const el = document.querySelector<HTMLElement>(`[data-voxu-spot="${spot}"]`)
  if (!el) return
  el.classList.add(SPOT_CLASS)
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
}

/**
 * Arrived with ?spot=…: light that part for a few seconds, then tidy the URL.
 *
 * Read in the effect, not during render — on an in-app navigation the page
 * renders while the address bar still shows the PREVIOUS page's URL — and
 * kept in a ref, so an effect that runs twice (React dev mode) still knows
 * what to light after the first run tidied the URL away.
 */
export function useArrivalSpot() {
  const spotRef = useRef<string | null>(null)
  useEffect(() => {
    const url = new URL(window.location.href)
    const fromUrl = url.searchParams.get('spot')
    if (fromUrl) {
      spotRef.current = fromUrl
      url.searchParams.delete('spot')
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
    }
    const spot = spotRef.current
    if (!spot) return
    // Wait for the part to exist (Today's list arrives after its fetch) and
    // for no popup to be covering it (html.modal-open — the daily popup opens
    // on Home), for up to ~12s; a glow nobody sees is no help.
    let tries = 0
    let off: number | undefined
    const poll = window.setInterval(() => {
      tries++
      const there = document.querySelector(`[data-voxu-spot="${spot}"]`)
      const covered = document.documentElement.classList.contains('modal-open')
      if (there && !covered) {
        window.clearInterval(poll)
        spotlight(spot)
        off = window.setTimeout(() => spotlight(undefined), 3500)
      } else if (tries > 30) {
        window.clearInterval(poll)
      }
    }, 400)
    return () => { window.clearInterval(poll); if (off) window.clearTimeout(off) }
  }, [])
}
