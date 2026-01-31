'use client'

import { useState, useEffect } from 'react'

interface FeatureHintProps {
  id: string
  text: string
  mode: 'once' | 'persistent'
}

export function FeatureHint({ id, text, mode }: FeatureHintProps) {
  const [visible, setVisible] = useState(false)
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    if (mode === 'persistent') {
      setVisible(true)
      const t = setTimeout(() => setOpacity(1), 50)
      return () => clearTimeout(t)
    }

    const key = `voxu_hint_seen_${id}`
    if (localStorage.getItem(key)) return

    setVisible(true)
    const fadeInTimer = setTimeout(() => setOpacity(1), 50)

    const hideTimer = setTimeout(() => {
      setOpacity(0)
      setTimeout(() => {
        setVisible(false)
        localStorage.setItem(key, '1')
      }, 1000)
    }, 8000)

    return () => {
      clearTimeout(fadeInTimer)
      clearTimeout(hideTimer)
    }
  }, [id, mode])

  if (!visible) return null

  return (
    <p
      className={`text-[11px] leading-relaxed italic tracking-wide mt-1.5 transition-opacity duration-1000 pointer-events-none ${
        mode === 'persistent' ? 'text-white/25' : 'text-white/45'
      }`}
      style={{ opacity }}
    >
      {text}
    </p>
  )
}
