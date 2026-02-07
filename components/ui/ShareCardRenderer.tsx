'use client'

import { useRef, useCallback } from 'react'

interface ShareCardRendererProps {
  content: string
  subtitle?: string
  type: 'quote' | 'affirmation' | 'tarot'
  onRender: (blob: Blob) => void
  triggerRender: boolean
}

export function ShareCardRenderer({ content, subtitle, type, onRender, triggerRender }: ShareCardRendererProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const render = useCallback(async () => {
    if (!cardRef.current) return
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        width: 540,
        height: 540,
        useCORS: true,
      })
      canvas.toBlob(blob => {
        if (blob) onRender(blob)
      }, 'image/png')
    } catch (err) {
      console.error('Share card render error:', err)
    }
  }, [onRender])

  // Trigger render when flag changes
  if (triggerRender) {
    render()
  }

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

  return (
    <div
      ref={cardRef}
      style={{
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
        width: '540px',
        height: '540px',
        background: gradients[type],
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '48px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Decorative border */}
      <div style={{
        position: 'absolute',
        inset: '16px',
        border: `1px solid ${accents[type]}33`,
        borderRadius: '16px',
      }} />

      {/* Label */}
      <div style={{
        fontSize: '11px',
        letterSpacing: '2px',
        textTransform: 'uppercase' as const,
        color: accents[type],
        marginBottom: '24px',
      }}>
        {labels[type]}
      </div>

      {/* Content */}
      <div style={{
        fontSize: '20px',
        lineHeight: '1.6',
        color: 'rgba(255,255,255,0.95)',
        textAlign: 'center' as const,
        fontStyle: type === 'quote' || type === 'affirmation' ? 'italic' : 'normal',
        maxWidth: '420px',
      }}>
        {type === 'quote' ? `"${content}"` : content}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div style={{
          fontSize: '13px',
          color: 'rgba(255,255,255,0.6)',
          marginTop: '16px',
        }}>
          — {subtitle}
        </div>
      )}

      {/* Branding */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: '1px',
      }}>
        VOXU
      </div>
    </div>
  )
}
