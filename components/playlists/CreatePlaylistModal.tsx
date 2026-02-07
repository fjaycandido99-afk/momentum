'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

interface CreatePlaylistModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (playlist: { id: string; name: string }) => void
}

export function CreatePlaylistModal({ isOpen, onClose, onCreated }: CreatePlaylistModalProps) {
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleCreate = async () => {
    if (!name.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create playlist')
        return
      }
      onCreated(data.playlist)
      setName('')
      onClose()
    } catch {
      setError('Something went wrong')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6 overlay-enter">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm p-6 rounded-2xl glass-refined glass-elevated">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">New Playlist</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
          placeholder="Playlist name"
          autoFocus
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-white/25 text-sm text-white placeholder:text-white/40 outline-none transition-colors"
        />
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        <button
          onClick={handleCreate}
          disabled={!name.trim() || creating}
          className="w-full mt-4 py-3 rounded-xl bg-white/15 hover:bg-white/20 text-sm text-white font-medium transition-colors disabled:opacity-40 press-scale"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create'}
        </button>
      </div>
    </div>
  )
}
