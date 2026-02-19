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
      card.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:540px;height:540px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;overflow:hidden;'

      const gradients: Record<string, string> = {
        quote: 'linear-gradient(160deg, #0a0a12 0%, #111827 40%, #0f172a 100%)',
        affirmation: 'linear-gradient(160deg, #0a0a12 0%, #1e1338 40%, #2d1b4e 100%)',
        tarot: 'linear-gradient(160deg, #0a0a12 0%, #1a1408 40%, #2a1810 100%)',
      }
      const accents: Record<string, string> = {
        quote: '#f59e0b',
        affirmation: '#a78bfa',
        tarot: '#d97706',
      }
      const glows: Record<string, string> = {
        quote: 'radial-gradient(ellipse at 70% 30%, rgba(245,158,11,0.08) 0%, transparent 60%)',
        affirmation: 'radial-gradient(ellipse at 70% 30%, rgba(167,139,250,0.08) 0%, transparent 60%)',
        tarot: 'radial-gradient(ellipse at 70% 30%, rgba(217,119,6,0.08) 0%, transparent 60%)',
      }
      const labels: Record<string, string> = {
        quote: 'Quote of the Day',
        affirmation: 'Daily Affirmation',
        tarot: 'Tarot Reading',
      }

      // SVG spiral logo matching SpiralLogo.tsx
      const spiralSvg = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="11.4" stroke="rgba(255,255,255,0.5)" stroke-width="0.8" stroke-dasharray="1.7 0.85"/>
        <circle cx="16" cy="16" r="8.6" stroke="rgba(255,255,255,0.6)" stroke-width="0.8" stroke-dasharray="0.5 0.85"/>
        <circle cx="16" cy="16" r="6" stroke="rgba(255,255,255,0.55)" stroke-width="0.8" stroke-dasharray="1.35 0.7"/>
        <circle cx="16" cy="16" r="1.8" fill="white"/>
      </svg>`

      card.style.background = '#000000'

      const isItalic = type === 'quote' || type === 'affirmation'
      const contentSize = content.length > 120 ? '24px' : content.length > 70 ? '28px' : '32px'

      card.innerHTML = `
        <div style="position:relative;width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:56px 48px 80px;">
          <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${accents[type]};margin-bottom:28px;font-weight:500;">${labels[type]}</div>
          <div style="font-size:${contentSize};line-height:1.55;color:rgba(255,255,255,0.95);text-align:center;font-style:${isItalic ? 'italic' : 'normal'};max-width:440px;font-weight:300;">${type === 'quote' ? `\u201C${content}\u201D` : content}</div>
          ${subtitle ? `<div style="font-size:14px;color:rgba(255,255,255,0.5);margin-top:20px;font-weight:400;">\u2014 ${subtitle}</div>` : ''}
        </div>
        <div style="position:absolute;bottom:28px;left:0;right:0;display:flex;justify-content:center;">
          <span style="font-size:18px;letter-spacing:6px;color:rgba(255,255,255,0.4);font-weight:300;font-family:var(--font-cormorant),Georgia,serif;">VOXU</span>
        </div>
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
