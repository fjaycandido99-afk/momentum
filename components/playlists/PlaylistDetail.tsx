'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Play, Trash2, GripVertical, Loader2 } from 'lucide-react'

interface PlaylistItemData {
  id: string
  content_type: string
  content_id: string
  title: string
  subtitle?: string | null
  genre_id?: string | null
  thumbnail?: string | null
  position: number
}

interface PlaylistDetailProps {
  playlistId: string
  onBack: () => void
  onPlayItem: (item: PlaylistItemData) => void
  onPlayAll: (items: PlaylistItemData[]) => void
}

export function PlaylistDetail({ playlistId, onBack, onPlayItem, onPlayAll }: PlaylistDetailProps) {
  const [playlist, setPlaylist] = useState<{ id: string; name: string; items: PlaylistItemData[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/playlists/${playlistId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.playlist) setPlaylist(data.playlist) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [playlistId])

  const handleRemoveItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/playlists/${playlistId}/items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })
      if (res.ok && playlist) {
        setPlaylist({ ...playlist, items: playlist.items.filter(i => i.id !== itemId) })
      }
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
      </div>
    )
  }

  if (!playlist) {
    return (
      <div className="text-center py-10 text-white/50 text-sm">Playlist not found</div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition-colors press-scale">
          <ArrowLeft className="w-5 h-5 text-white/70" />
        </button>
        <h2 className="text-lg font-semibold text-white flex-1">{playlist.name}</h2>
        {playlist.items.length > 0 && (
          <button
            onClick={() => onPlayAll(playlist.items)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 press-scale hover:bg-white/20 transition-colors"
          >
            <Play className="w-4 h-4 text-white" fill="white" />
            <span className="text-sm text-white">Play All</span>
          </button>
        )}
      </div>

      {playlist.items.length === 0 ? (
        <div className="text-center py-10 text-white/50 text-sm">
          No items yet. Add tracks from the home page.
        </div>
      ) : (
        <div className="space-y-1">
          {playlist.items.map((item, i) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-xl glass-refined group press-scale"
            >
              <GripVertical className="w-4 h-4 text-white/20 shrink-0" />
              <span className="text-xs text-white/40 w-5">{i + 1}</span>
              <button
                className="flex-1 min-w-0 text-left"
                onClick={() => onPlayItem(item)}
              >
                <p className="text-sm text-white truncate">{item.title}</p>
                {item.subtitle && <p className="text-xs text-white/50 truncate">{item.subtitle}</p>}
              </button>
              <button
                onClick={() => handleRemoveItem(item.id)}
                className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
                aria-label="Remove"
              >
                <Trash2 className="w-3.5 h-3.5 text-white/50 hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
