'use client'

import { useState, useEffect } from 'react'
import { Bookmark, Loader2, Trash2, Plus, ListMusic } from 'lucide-react'
import { PlaylistCard } from '@/components/playlists/PlaylistCard'
import { PlaylistDetail } from '@/components/playlists/PlaylistDetail'
import { CreatePlaylistModal } from '@/components/playlists/CreatePlaylistModal'

type SavedTab = 'favorites' | 'playlists'
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

interface PlaylistData {
  id: string
  name: string
  items: { id: string; title: string; thumbnail?: string | null }[]
}

export default function SavedPage() {
  const [activeTab, setActiveTab] = useState<SavedTab>('favorites')
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [playlists, setPlaylists] = useState<PlaylistData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<SavedFilter>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [openPlaylistId, setOpenPlaylistId] = useState<string | null>(null)

  useEffect(() => {
    fetchFavorites()
    fetchPlaylists()
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

  const fetchPlaylists = async () => {
    try {
      const response = await fetch('/api/playlists')
      if (response.ok) {
        const data = await response.json()
        setPlaylists(data.playlists || [])
      }
    } catch {}
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

  if (openPlaylistId) {
    return (
      <div className="min-h-screen text-white pb-24">
        <div className="px-6 pt-12 pb-4">
          <PlaylistDetail
            playlistId={openPlaylistId}
            onBack={() => { setOpenPlaylistId(null); fetchPlaylists() }}
            onPlayItem={() => {}}
            onPlayAll={() => {}}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white pb-24">
      <div className="px-6 pt-12 pb-4 header-fade-bg">
        <h1 className="text-2xl font-semibold shimmer-text">Saved</h1>
      </div>

      <div className="px-6 space-y-4">
        {/* Tab Toggle */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/5">
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'favorites' ? 'bg-white/15 text-white' : 'text-white/50'
            }`}
          >
            Favorites
          </button>
          <button
            onClick={() => setActiveTab('playlists')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'playlists' ? 'bg-white/15 text-white' : 'text-white/50'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            Playlists
          </button>
        </div>

        {activeTab === 'favorites' ? (
          <>
            {/* Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {filters.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all press-scale ${
                    filter === f.id
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'bg-white/5 text-white/95 border border-transparent hover:bg-white/10'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-white/95 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Bookmark className="w-8 h-8 text-white/95 mx-auto mb-3" />
                <p className="text-white/95 text-sm">
                  {filter === 'all' ? 'No saved items yet' : `No saved ${filter}s`}
                </p>
                <p className="text-white/95 text-xs mt-1">
                  Tap the heart icon on quotes or voice guides to save them
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(item => (
                  <div
                    key={item.id}
                    className="p-4 glass-refined rounded-2xl group"
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
                          <span className="text-[10px] text-white/95">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {item.content_type === 'reflection' && parseReflection(item.content_text) ? (
                          <div className="space-y-2">
                            <p className="text-sm text-white/95 italic leading-relaxed">
                              &ldquo;{parseReflection(item.content_text)!.question}&rdquo;
                            </p>
                            <p className="text-sm text-white/95 leading-relaxed pl-3 border-l-2 border-violet-500/30">
                              {parseReflection(item.content_text)!.answer}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-white/95 leading-relaxed">
                            {item.content_text}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white/95 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Playlists Tab */}
            <div className="grid grid-cols-2 gap-3">
              {playlists.map(pl => (
                <PlaylistCard
                  key={pl.id}
                  id={pl.id}
                  name={pl.name}
                  items={pl.items}
                  onOpen={(id) => setOpenPlaylistId(id)}
                  onPlay={() => {}}
                />
              ))}
              {/* Create button */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex flex-col items-center justify-center aspect-square rounded-2xl border border-dashed border-white/15 hover:bg-white/5 transition-colors press-scale"
              >
                <Plus className="w-8 h-8 text-white/30 mb-2" />
                <span className="text-xs text-white/50">New Playlist</span>
              </button>
            </div>
          </>
        )}
      </div>

      <CreatePlaylistModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => fetchPlaylists()}
      />
    </div>
  )
}
