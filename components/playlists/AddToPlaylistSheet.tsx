'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Loader2, Check, Music } from 'lucide-react'

interface PlaylistSummary {
  id: string
  name: string
  _count?: { items: number }
}

interface AddToPlaylistSheetProps {
  isOpen: boolean
  onClose: () => void
  contentType: string
  contentId: string
  title: string
  subtitle?: string
  genreId?: string
  thumbnail?: string
  onCreateNew: () => void
}

export function AddToPlaylistSheet({
  isOpen, onClose, contentType, contentId, title, subtitle, genreId, thumbnail, onCreateNew,
}: AddToPlaylistSheetProps) {
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setAddedTo(new Set())
    fetch('/api/playlists')
      .then(r => r.ok ? r.json() : { playlists: [] })
      .then(data => setPlaylists(data.playlists || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isOpen])

  const handleAdd = async (playlistId: string) => {
    setAdding(playlistId)
    try {
      const res = await fetch(`/api/playlists/${playlistId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_type: contentType, content_id: contentId, title, subtitle, genre_id: genreId, thumbnail }),
      })
      if (res.ok || res.status === 409) {
        setAddedTo(prev => new Set(prev).add(playlistId))
      }
    } catch {}
    setAdding(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overlay-enter">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-2xl glass-refined glass-elevated p-5 pb-8 safe-area-pb">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">Add to Playlist</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        <div className="text-xs text-white/50 mb-3 truncate">{title}</div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
          </div>
        ) : (
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {playlists.map(pl => (
              <button
                key={pl.id}
                onClick={() => handleAdd(pl.id)}
                disabled={addedTo.has(pl.id) || adding === pl.id}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors disabled:opacity-60"
              >
                <Music className="w-4 h-4 text-white/40 shrink-0" />
                <span className="text-sm text-white flex-1 text-left truncate">{pl.name}</span>
                {adding === pl.id ? (
                  <Loader2 className="w-4 h-4 text-white/50 animate-spin" />
                ) : addedTo.has(pl.id) ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Plus className="w-4 h-4 text-white/40" />
                )}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => { onClose(); onCreateNew() }}
          className="w-full mt-3 py-3 rounded-xl border border-dashed border-white/15 hover:bg-white/5 text-sm text-white/70 transition-colors press-scale"
        >
          + New Playlist
        </button>
      </div>
    </div>
  )
}
