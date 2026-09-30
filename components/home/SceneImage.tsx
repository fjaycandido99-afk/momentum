'use client'

import { useState } from 'react'

/**
 * A card's photograph: absolutely placed, faded toward the card's text so
 * the words always sit on dark (see HOME_SCENES).
 *
 * A missing file renders nothing — no broken-image box — so a card can name
 * its scene before the photo exists and simply lights up once it's added.
 * The parent must be `relative overflow-hidden` (card-surface-lg is).
 */
export function SceneImage({
  src,
  fade = 'left',
  className = 'inset-y-0 right-0 w-[62%] h-full',
  position = 'center right',
  opacity = 0.9,
}: {
  src: string | null | undefined
  /** Which way the photo dissolves: toward the text. */
  fade?: 'left' | 'down' | 'left-down' | 'left-up'
  /** Size and placement of the photo inside its card. */
  className?: string
  position?: string
  opacity?: number
}) {
  const [missing, setMissing] = useState(false)
  if (!src || missing) return null

  const mask =
    fade === 'down' ? 'linear-gradient(to bottom, black 35%, transparent)'
      : fade === 'left-down' ? 'linear-gradient(to left, black 40%, transparent), linear-gradient(to bottom, black 50%, transparent)'
      : fade === 'left-up' ? 'linear-gradient(to left, black 40%, transparent), linear-gradient(to top, black 45%, transparent)'
      : 'linear-gradient(to left, black 42%, transparent)'
  const twoWay = fade === 'left-down' || fade === 'left-up'

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden
      loading="lazy"
      decoding="async"
      onError={() => setMissing(true)}
      className={`absolute pointer-events-none select-none object-cover ${className}`}
      style={{
        objectPosition: position,
        opacity,
        WebkitMaskImage: mask,
        maskImage: mask,
        // Two gradients must BOTH be opaque for a pixel to show.
        WebkitMaskComposite: twoWay ? 'source-in' : undefined,
        maskComposite: twoWay ? 'intersect' : undefined,
      }}
    />
  )
}
