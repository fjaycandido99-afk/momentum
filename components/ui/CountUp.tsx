'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * A number that moves to its new value instead of snapping to it.
 *
 * Used where a number changing IS the feedback — the kept percentage after a
 * check-in. A figure that silently replaces itself is the difference between
 * "that counted" and "the form submitted".
 *
 * Honours prefers-reduced-motion by landing on the value immediately: for
 * someone who gets motion sick, an animating statistic is not a reward.
 */
export function CountUp({
  value,
  duration = 700,
  suffix = '',
  className,
}: {
  value: number
  duration?: number
  suffix?: string
  className?: string
}) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced || from.current === value) {
      from.current = value
      setShown(value)
      return
    }

    const start = performance.now()
    const startValue = from.current
    const delta = value - startValue
    // Ease-out: fast enough to feel like a response, settling rather than
    // stopping dead.
    const ease = (t: number) => 1 - Math.pow(1 - t, 3)

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setShown(Math.round(startValue + delta * ease(t)))
      if (t < 1) frame.current = requestAnimationFrame(tick)
      else from.current = value
    }
    frame.current = requestAnimationFrame(tick)

    return () => { if (frame.current !== null) cancelAnimationFrame(frame.current) }
  }, [value, duration])

  return <span className={className}>{shown}{suffix}</span>
}
