'use client'

import { useState } from 'react'
import { Mail, ChevronDown, Loader2, Share2, Sparkles } from 'lucide-react'
import { useShareCard } from '@/hooks/useShareCard'
import { logXPEventServer } from '@/lib/gamification'

export function LetterToSelf() {
  const [letter, setLetter] = useState<string | null>(null)
  const [letterType, setLetterType] = useState<'future' | 'past'>('future')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [xpAwarded, setXpAwarded] = useState(false)
  const { shareAsImage, isGenerating: isShareGenerating } = useShareCard()

  const generateLetter = async (type: 'future' | 'past') => {
    setLetterType(type)
    setLoading(true)
    setExpanded(true)

    try {
      const res = await fetch('/api/ai/letter-to-self', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      if (res.ok) {
        const data = await res.json()
        setLetter(data.letter)
        if (!data.cached && !xpAwarded) {
          logXPEventServer('letterToSelf', 'letter-to-self')
          setXpAwarded(true)
        }
      }
    } catch {
      setLetter('Every step you\'ve taken matters. Your growth is real and your future is bright.')
    } finally {
      setLoading(false)
    }
  }

  const handleShare = () => {
    if (!letter) return
    const preview = letter.substring(0, 200) + (letter.length > 200 ? '...' : '')
    shareAsImage(preview, 'quote', letterType === 'future' ? 'Your Future Self' : 'Your Present Self')
  }

  return (
    <div id="letter-to-self" className="glass-refined rounded-2xl overflow-hidden">
      <button
        onClick={() => {
          if (letter) {
            setExpanded(!expanded)
          } else {
            generateLetter('future')
          }
        }}
        className="w-full p-5 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-pink-500/15">
            <Mail className="w-5 h-5 text-pink-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-medium text-white">Letter to Self</h3>
            <p className="text-[10px] text-white/70">AI-written from your journey</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 text-white/70 animate-spin" />}
          <ChevronDown className={`w-4 h-4 text-white/70 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* Type selector */}
          <div className="flex gap-2">
            <button
              onClick={() => generateLetter('future')}
              disabled={loading}
              className={`flex-1 py-3 text-xs font-medium rounded-lg transition-all ${
                letterType === 'future'
                  ? 'bg-pink-500/20 text-pink-300'
                  : 'bg-white/5 text-white/75 hover:text-white/80'
              }`}
            >
              From Future Self
            </button>
            <button
              onClick={() => generateLetter('past')}
              disabled={loading}
              className={`flex-1 py-3 text-xs font-medium rounded-lg transition-all ${
                letterType === 'past'
                  ? 'bg-pink-500/20 text-pink-300'
                  : 'bg-white/5 text-white/75 hover:text-white/80'
              }`}
            >
              To Past Self
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <Sparkles className="w-4 h-4 text-pink-400 animate-pulse" />
              <span className="text-xs text-white/70">Writing your letter...</span>
            </div>
          ) : letter ? (
            <>
              <div className="p-4 rounded-xl bg-white/5 border border-pink-500/10">
                <p className="text-sm text-white/90 leading-relaxed whitespace-pre-line font-serif italic">
                  {letter}
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleShare}
                  disabled={isShareGenerating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
