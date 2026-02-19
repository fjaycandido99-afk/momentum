'use client'

import { useState, useEffect, useRef } from 'react'
import { Music, Play, Check } from 'lucide-react'
import { MUSIC_GENRES } from '@/components/home/home-types'
import { haptic } from '@/lib/haptics'

const FOCUS_GENRE_IDS = ['lofi', 'classical', 'piano', 'jazz', 'study', 'ambient']
const FOCUS_GENRES = MUSIC_GENRES.filter(g => FOCUS_GENRE_IDS.includes(g.id))

interface GenreVideo {
  youtubeId: string
  title: string
  channel: string
  duration?: number
}

interface GenreCache {
  videos: GenreVideo[]
  backgrounds: string[]
}

export interface FocusMusicChoice {
  genreId: string
  genreWord: string
  youtubeId: string
  title: string
  channel: string
  thumbnail: string
}

interface FocusMusicPickerProps {
  selected: FocusMusicChoice | null
  onSelect: (choice: FocusMusicChoice | null) => void
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function FocusMusicPicker({ selected, onSelect }: FocusMusicPickerProps) {
  const [cache, setCache] = useState<Record<string, GenreCache>>({})
  const [loading, setLoading] = useState(true)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const fetchAll = async () => {
      const results = await Promise.allSettled(
        FOCUS_GENRES.map(async (genre) => {
          const [musicRes, bgRes] = await Promise.all([
            fetch(`/api/music-videos?genre=${genre.id}`),
            fetch(`/api/backgrounds?genre=${genre.id}`),
          ])

          const musicData = musicRes.ok ? await musicRes.json() : { videos: [] }
          const bgData = bgRes.ok ? await bgRes.json() : { images: [] }

          const videos: GenreVideo[] = (musicData.videos || []).map((v: any) => ({
            youtubeId: v.youtubeId,
            title: v.title,
            channel: v.channel || genre.word,
            duration: v.duration || 0,
          }))

          const backgrounds: string[] = (bgData.images || []).map((img: any) => img.url)

          return { genreId: genre.id, videos, backgrounds }
        })
      )

      const map: Record<string, GenreCache> = {}
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.videos.length > 0) {
          map[r.value.genreId] = {
            videos: r.value.videos,
            backgrounds: r.value.backgrounds,
          }
        }
      }
      setCache(map)
      setLoading(false)
    }
    fetchAll()
  }, [])

  const handleSelect = (genre: typeof FOCUS_GENRES[number]) => {
    haptic('light')
    if (selected?.genreId === genre.id) {
      onSelect(null)
      return
    }
    const data = cache[genre.id]
    if (!data || data.videos.length === 0) return
    const videoIdx = Math.floor(Math.random() * data.videos.length)
    const video = data.videos[videoIdx]
    const bg = data.backgrounds.length > 0
      ? data.backgrounds[videoIdx % data.backgrounds.length]
      : `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`
    onSelect({
      genreId: genre.id,
      genreWord: genre.word,
      youtubeId: video.youtubeId,
      title: video.title,
      channel: video.channel,
      thumbnail: bg,
    })
  }

  return (
    <div>
      <p className="text-xs text-white/90 uppercase tracking-widest mb-3">Background Music</p>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6 snap-row">
        {/* None card */}
        <button
          onClick={() => { haptic('light'); onSelect(null) }}
          className="shrink-0 w-40 text-left press-scale snap-card"
        >
          <div className="relative w-40 h-40 rounded-2xl bg-white/[0.04] flex items-center justify-center">
            <Music className="w-8 h-8 text-white/25" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-white/95 mt-2">No music</p>
        </button>

        {/* Genre cards */}
        {FOCUS_GENRES.map((genre, gi) => {
          const data = cache[genre.id]
          const isActive = selected?.genreId === genre.id
          const bgUrl = isActive && selected?.thumbnail
            ? selected.thumbnail
            : data?.backgrounds[gi % (data?.backgrounds.length || 1)]
          const video = data?.videos[0]

          return (
            <button
              key={genre.id}
              onClick={() => handleSelect(genre)}
              disabled={loading && !data}
              className="shrink-0 w-40 text-left group press-scale snap-card"
            >
              <div className="relative w-40 h-40 rounded-2xl overflow-hidden bg-[#14141a]">
                {bgUrl ? (
                  <>
                    <img
                      src={bgUrl}
                      alt={genre.word}
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
                        isActive ? 'opacity-80' : 'opacity-50 group-hover:opacity-65'
                      }`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/20" />
                  </>
                ) : (
                  <div className="absolute inset-0 animate-pulse bg-white/[0.03]" />
                )}

                {/* Duration badge */}
                {video?.duration && video.duration > 0 && (
                  <span className="absolute bottom-2 right-2 z-10 px-1.5 py-0.5 rounded-md bg-black/70 text-[10px] text-white/90 font-medium">
                    {formatDuration(video.duration)}
                  </span>
                )}

                {/* Center icon — check when active, play when not */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {isActive ? (
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                      <Check className="w-5 h-5 text-black" strokeWidth={3} />
                    </div>
                  ) : (
                    <Play className="w-8 h-8 text-white/95 drop-shadow-lg" fill="rgba(255,255,255,0.45)" />
                  )}
                </div>
              </div>

              <p className={`text-sm mt-2 ${isActive ? 'text-white font-medium' : 'text-white/95'}`}>
                {genre.word}
              </p>
            </button>
          )
        })}
        <div className="shrink-0 w-4 md:hidden" aria-hidden />
      </div>
    </div>
  )
}
