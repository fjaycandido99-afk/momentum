'use client'

import { useState } from 'react'

/**
 * A screen's backdrop photograph — the whole page sits on it, dimmed, and
 * the cards float over it (the mockups' depth comes from this, not from the
 * colour alone).
 *
 * It holds still while the page scrolls: it is drawn behind the scrolling
 * container, not inside it. Darkened at the top so the header and first
 * words read, and at the very bottom so the player bar does. A missing file
 * leaves just the .voxu-scene gradient — the page looks as it did without it.
 *
 * The parent must be positioned (Home's root is `isolate` with a fixed height).
 */
export function SceneBackdrop({
  src,
  wideSrc,
  opacity = 0.55,
}: {
  src: string | null | undefined
  /** Used when the screen is wider than 4:3 (iPad landscape): a tall photo
   *  there would be scaled up past its pixels and look soft. */
  wideSrc?: string | null
  opacity?: number
}) {
  const [missing, setMissing] = useState(false)
  if (!src || missing) return null
  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden>
      <picture>
        {wideSrc && <source media="(min-aspect-ratio: 4/3)" srcSet={wideSrc} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          decoding="async"
          onError={() => setMissing(true)}
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ opacity }}
        />
      </picture>
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgb(7 10 18 / 0.85) 0%, rgb(7 10 18 / 0.35) 22%, rgb(7 10 18 / 0.25) 55%, rgb(5 7 12 / 0.7) 88%, rgb(5 7 12 / 0.92) 100%)',
        }}
      />
    </div>
  )
}
