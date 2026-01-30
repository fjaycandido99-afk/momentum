'use client'

import { useState, useEffect } from 'react'
import { Bookmark, Loader2, Play, Trash2 } from 'lucide-react'

type SavedFilter = 'all' | 'quote' | 'journal' | 'affirmation' | 'reflection'

interface FavoriteItem {
  id: string
  content_type: string
  content_text: string
  created_at: string
}

export default function SavedPage() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<SavedFilter>('all')

  useEffect(() => {
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
    try {
      const response = await fetch('/api/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (response.ok) {
        setFavorites(prev => prev.filter(f => f.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete favorite:', error)
    }
  }

  const filtered = filter === 'all'
    ? favorites
    : favorites.filter(f => f.content_type === filter)

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
    } catch {
      // not JSON
    }
    return null
  }

  return (
    <div className="min-h-screen text-white pb-24">
      <div className="px-6 pt-12 pb-4 section-fade-bg">
        <h1 className="text-2xl font-semibold text-white">Saved</h1>
      </div>

      <div className="px-6 space-y-4">
        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all press-scale ${
                filter === f.id
                  ? 'bg-white/15 text-white border border-white/20'
                  : 'bg-white/5 text-white/60 border border-transparent hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Bookmark className="w-8 h-8 text-white/20 mx-auto mb-3" />
            <p className="text-white/50 text-sm">
              {filter === 'all' ? 'No saved items yet' : `No saved ${filter}s`}
            </p>
            <p className="text-white/30 text-xs mt-1">
              Tap the heart icon on quotes or voice guides to save them
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => (
              <div
                key={item.id}
                className="p-4 card-gradient-border group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        item.content_type === 'quote' ? 'bg-amber-500/20 text-amber-400' :
                        item.content_type === 'breathing' ? 'bg-blue-500/20 text-blue-400' :
                        item.content_type === 'affirmation' ? 'bg-indigo-500/20 text-indigo-400' :
                        item.content_type === 'reflection' ? 'bg-violet-500/20 text-violet-400' :
                        'bg-purple-500/20 text-purple-400'
                      }`}>
                        {item.content_type}
                      </span>
                      <span className="text-[10px] text-white/30">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {item.content_type === 'reflection' && parseReflection(item.content_text) ? (
                      <div className="space-y-2">
                        <p className="text-sm text-white/50 italic leading-relaxed">
                          &ldquo;{parseReflection(item.content_text)!.question}&rdquo;
                        </p>
                        <p className="text-sm text-white/80 leading-relaxed pl-3 border-l-2 border-violet-500/30">
                          {parseReflection(item.content_text)!.answer}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-white/80 leading-relaxed">
                        {item.content_text}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white/40 hover:text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
