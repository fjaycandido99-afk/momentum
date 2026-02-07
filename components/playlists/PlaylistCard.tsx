'use client'

import { Play, Music } from 'lucide-react'

interface PlaylistItem {
  id: string
  title: string
  thumbnail?: string | null
}

interface PlaylistCardProps {
  id: string
  name: string
  items: PlaylistItem[]
  onOpen: (id: string) => void
  onPlay: (id: string) => void
}

export function PlaylistCard({ id, name, items, onOpen, onPlay }: PlaylistCardProps) {
  return (
    <div className="glass-refined rounded-2xl overflow-hidden press-scale" onClick={() => onOpen(id)}>
      {/* Thumbnail grid */}
      <div className="relative w-full aspect-square grid grid-cols-2 gap-[1px] bg-white/5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-[#111113] flex items-center justify-center">
            {items[i]?.thumbnail ? (
              <img src={items[i].thumbnail!} alt="" className="w-full h-full object-cover opacity-60" />
            ) : (
              <Music className="w-5 h-5 text-white/20" />
            )}
          </div>
        ))}
        <button
          onClick={(e) => { e.stopPropagation(); onPlay(id) }}
          className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center press-scale hover:bg-white/30 transition-colors"
          aria-label={`Play ${name}`}
        >
          <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
        </button>
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-white truncate">{name}</p>
        <p className="text-xs text-white/50">{items.length} track{items.length !== 1 ? 's' : ''}</p>
      </div>
    </div>
  )
}
