'use client'

import { useState, useEffect, useMemo } from 'react'
import { Bookmark, Loader2, Trash2, Sparkles, X } from 'lucide-react'
import { FeatureHint } from '@/components/ui/FeatureHint'
import { trackFeature } from '@/lib/analytics/track'

type SavedFilter = 'all' | 'quote' | 'journal' | 'affirmation' | 'reflection'

interface FavoriteItem {
  id: string
  content_type: string
  content_text: string
  content_id?: string | null
  content_title?: string | null
  thumbnail?: string | null
  created_at: string
}

export default function SavedPage() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<SavedFilter>('all')
  const [expanded, setExpanded] = useState<FavoriteItem | null>(null)

  useEffect(() => {
    trackFeature('saved_content', 'open')
    fetchFavorites()
  }, [])

  const fetchFavorites = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/favorites')
      if (response.ok) {
        const data = await response.json()
        setFavorites(data.favorites || [])
      }
    } catch (error) {
      console.error('Failed to fetch favorites:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    setFavorites(prev => prev.filter(f => f.id !== id))
    try {
      await fetch('/api/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch {
      fetchFavorites()
    }
  }

  // Only show text-based favorites (no music/motivation — those live on the home page)
  const textOnly = favorites.filter(f => f.content_type !== 'music' && f.content_type !== 'motivation')
  const filtered = filter === 'all'
    ? textOnly
    : textOnly.filter(f => f.content_type === filter)

  // "Memory resurfaced" — a weekly-stable featured pick (prefers quotes) that
  // reframes Saved from a list into a personal archive. Needs a few saves first.
  const featured = useMemo(() => {
    const text = favorites.filter(f => f.content_type !== 'music' && f.content_type !== 'motivation')
    const quotes = text.filter(f => f.content_type === 'quote')
    const pool = quotes.length ? quotes : text
    if (text.length < 3 || !pool.length) return null
    const weekSeed = Math.floor(Date.now() / (7 * 24 * 3600 * 1000))
    return pool[weekSeed % pool.length]
  }, [favorites])
  const showFeatured = filter === 'all' && !!featured

  const featuredText = (item: FavoriteItem): string => {
    let t = item.content_text
    if (item.content_type === 'reflection') {
      const r = parseReflection(item.content_text)
      if (r) t = r.answer
    }
    return t.length > 200 ? t.slice(0, 197).trimEnd() + '…' : t
  }

  // Don't repeat the featured memory in the list below it.
  const listItems = showFeatured && featured ? filtered.filter(f => f.id !== featured.id) : filtered

  const filters: { id: SavedFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'quote', label: 'Quotes' },
    { id: 'journal', label: 'Journals' },
    { id: 'affirmation', label: 'Affirmations' },
    { id: 'reflection', label: 'Reflections' },
  ]

  const parseReflection = (text: string): { question: string; answer: string } | null => {
    try {
      const parsed = JSON.parse(text)
      if (parsed.question && parsed.answer) return parsed
    } catch {}
    return null
  }

  return (
    <div className="min-h-screen text-white pb-24">
      <div className="sticky top-0 z-50 px-8 pt-12 pb-4 mb-4 bg-black">
        <div className="absolute -bottom-6 left-0 right-0 h-6 bg-gradient-to-b from-black via-black/60 to-transparent pointer-events-none" />
        <h1 className="text-2xl font-semibold shimmer-text">Saved</h1>
        <FeatureHint id="saved-intro" text="Heart any video to save it here for quick access" mode="once" />
      </div>

      <div className="px-8 space-y-4">
        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all press-scale ${
                filter === f.id
                  ? 'bg-white/15 text-white border border-white/25'
                  : 'bg-white/5 text-white/70 border border-transparent hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Bookmark className="w-8 h-8 text-white/50 mx-auto mb-3" />
            <p className="text-white/70 text-sm">
              {filter === 'all' ? 'No saved items yet' : `No saved ${filter}s`}
            </p>
            <p className="text-white/50 text-xs mt-1">
              Tap the heart icon on quotes or voice guides to save them
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Featured — "Memory resurfaced": the cinematic hero that turns the
                list into an archive. Monochrome aura + editorial serif. */}
            {showFeatured && featured && (
              <div
                onClick={() => setExpanded(featured)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setExpanded(featured) }}
                className="relative overflow-hidden rounded-3xl card-surface-lg p-6 cursor-pointer press-scale"
              >
                <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-white/[0.07] blur-3xl pointer-events-none animate-breathe" aria-hidden />
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-white/60" />
                    <span className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">Memory resurfaced</span>
                  </div>
                  <p className="mt-4 text-2xl leading-snug text-white" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                    &ldquo;{featuredText(featured)}&rdquo;
                  </p>
                  <p className="mt-3 text-xs text-white/45">
                    Saved {new Date(featured.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            )}

            {showFeatured && listItems.length > 0 && (
              <h2 className="text-[11px] font-medium text-white/45 uppercase tracking-wider pt-3 pb-0.5">Recent reflections</h2>
            )}

            {listItems.map(item => (
              <div
                key={item.id}
                onClick={() => setExpanded(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setExpanded(item) }}
                className="p-4 rounded-2xl group bg-white/[0.03] border border-white/[0.08] cursor-pointer hover:bg-white/[0.05] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white/70 capitalize">
                        {item.content_type}
                      </span>
                      <span className="text-[10px] text-white/50">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {item.content_type === 'reflection' && parseReflection(item.content_text) ? (
                      <div className="space-y-2">
                        <p className="text-sm text-white/70 italic leading-relaxed">
                          &ldquo;{parseReflection(item.content_text)!.question}&rdquo;
                        </p>
                        <p className="text-sm text-white/70 leading-relaxed pl-3 border-l-2 border-white/20">
                          {parseReflection(item.content_text)!.answer}
                        </p>
                      </div>
                    ) : item.content_type === 'quote' ? (
                      <p className="text-base text-white/85 leading-relaxed" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                        {item.content_text}
                      </p>
                    ) : (
                      <p className="text-sm text-white/70 leading-relaxed">
                        {item.content_text}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}
                    className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white/50 hover:text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive memory expansion — tap a memory and it opens: the page
          blurs away, the atmosphere deepens, the words enlarge. Like opening it. */}
      {expanded && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-6 animate-fade-in"
          style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', background: 'rgba(0,0,0,0.72)' }}
          onClick={() => setExpanded(null)}
          role="dialog"
          aria-modal="true"
        >
          {/* deepened atmosphere — a large breathing aura behind the memory */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] rounded-full bg-white/[0.08] blur-3xl pointer-events-none animate-breathe" aria-hidden />

          <div
            className="relative w-full max-w-md card-surface-lg rounded-3xl p-8 animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setExpanded(null)}
              aria-label="Close"
              className="absolute top-4 right-4 p-1.5 rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white/70 capitalize">{expanded.content_type}</span>
              <span className="text-[10px] text-white/45">
                {new Date(expanded.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            {expanded.content_type === 'reflection' && parseReflection(expanded.content_text) ? (
              <div className="mt-5 space-y-3">
                <p className="text-base text-white/55 italic leading-relaxed">&ldquo;{parseReflection(expanded.content_text)!.question}&rdquo;</p>
                <p className="text-xl text-white leading-relaxed pl-3 border-l-2 border-white/20" style={{ fontFamily: 'Georgia, serif' }}>
                  {parseReflection(expanded.content_text)!.answer}
                </p>
              </div>
            ) : (
              <p className="mt-5 text-2xl text-white leading-snug" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                &ldquo;{expanded.content_text}&rdquo;
              </p>
            )}

            <div className="mt-8 flex items-center justify-end">
              <button
                onClick={() => { handleDelete(expanded.id); setExpanded(null) }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/5 border border-white/15 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs press-scale"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
