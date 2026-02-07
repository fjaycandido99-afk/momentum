'use client'

import { useState, useCallback, useRef } from 'react'

export function useShareCard() {
  const [isGenerating, setIsGenerating] = useState(false)
  const cardRef = useRef<HTMLDivElement | null>(null)

  const shareFromHTML = useCallback(async (html: string, width: number = 540, height: number = 540) => {
    setIsGenerating(true)
    try {
      const card = document.createElement('div')
      card.innerHTML = html
      const inner = card.firstElementChild as HTMLElement
      if (inner) {
        inner.style.position = 'fixed'
        document.body.appendChild(inner)
        const html2canvas = (await import('html2canvas')).default
        const canvas = await html2canvas(inner, { backgroundColor: null, scale: 2, width, height, useCORS: true })
        document.body.removeChild(inner)
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
        if (!blob) throw new Error('Failed to create image')
        const file = new File([blob], 'voxu-share.png', { type: 'image/png' })
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Shared from Voxu' })
        } else {
          await navigator.clipboard.writeText('Shared from Voxu')
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') console.error('Share error:', err)
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const shareAsImage = useCallback(async (
    content: string,
    type: 'quote' | 'affirmation' | 'tarot',
    subtitle?: string
  ) => {
    setIsGenerating(true)
    try {
      // Create off-screen card element
      const card = document.createElement('div')
      card.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:540px;height:540px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:48px;'

      const gradients: Record<string, string> = {
        quote: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        affirmation: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #4a1942 100%)',
        tarot: 'linear-gradient(135deg, #2a1810 0%, #3d2914 50%, #1a0e2e 100%)',
      }
      const accents: Record<string, string> = {
        quote: '#f59e0b',
        affirmation: '#8b5cf6',
        tarot: '#d97706',
      }
      const labels: Record<string, string> = {
        quote: 'Quote of the Day',
        affirmation: 'Daily Affirmation',
        tarot: 'Tarot Card of the Day',
      }

      card.style.background = gradients[type]

      card.innerHTML = `
        <div style="position:absolute;inset:16px;border:1px solid ${accents[type]}33;border-radius:16px;"></div>
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${accents[type]};margin-bottom:24px;">${labels[type]}</div>
        <div style="font-size:20px;line-height:1.6;color:rgba(255,255,255,0.95);text-align:center;font-style:${type === 'quote' || type === 'affirmation' ? 'italic' : 'normal'};max-width:420px;">${type === 'quote' ? `&ldquo;${content}&rdquo;` : content}</div>
        ${subtitle ? `<div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:16px;">&mdash; ${subtitle}</div>` : ''}
        <div style="position:absolute;bottom:24px;font-size:12px;color:rgba(255,255,255,0.3);letter-spacing:1px;">VOXU</div>
      `

      document.body.appendChild(card)
      cardRef.current = card

      // Lazy-load html2canvas
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(card, {
        backgroundColor: null,
        scale: 2,
        width: 540,
        height: 540,
        useCORS: true,
      })

      document.body.removeChild(card)
      cardRef.current = null

      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/png')
      )

      if (!blob) {
        throw new Error('Failed to create image')
      }

      const file = new File([blob], 'voxu-share.png', { type: 'image/png' })

      // Try native share with file
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Shared from Voxu',
        })
      } else {
        // Fallback: copy text
        const text = type === 'quote'
          ? `"${content}"${subtitle ? ` — ${subtitle}` : ''}\n\nFrom Voxu`
          : `${content}\n\nFrom Voxu`
        await navigator.clipboard.writeText(text)
      }
    } catch (err) {
      // User cancelled share or error
      if ((err as Error).name !== 'AbortError') {
        console.error('Share error:', err)
      }
    } finally {
      // Cleanup if still attached
      if (cardRef.current && document.body.contains(cardRef.current)) {
        document.body.removeChild(cardRef.current)
        cardRef.current = null
      }
      setIsGenerating(false)
    }
  }, [])

  return { shareAsImage, shareFromHTML, isGenerating }
}
