'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ChevronUp, ChevronDown, Volume2, Music, Pause, Play } from 'lucide-react'
import { haptic } from '@/lib/haptics'
import { useHomeAudioOptional } from '@/contexts/HomeAudioContext'
import { SOUNDSCAPE_ITEMS, type SoundscapeItem } from '@/components/player/SoundscapePlayer'
import { MUSIC_GENRES } from '@/components/home/home-types'
import type { FocusMusicChoice } from './FocusMusicPicker'

// All soundscapes available for focus
const FOCUS_SOUNDS = SOUNDSCAPE_ITEMS

const FOCUS_GENRE_IDS = ['lofi', 'classical', 'piano', 'jazz', 'study', 'ambient']
const FOCUS_GENRES = MUSIC_GENRES.filter(g => FOCUS_GENRE_IDS.includes(g.id))

interface FocusAudioControlsProps {
  selectedSound: SoundscapeItem | null
  selectedMusic: FocusMusicChoice | null
  soundscapePlaying: boolean
  musicPlaying: boolean
  onToggleSoundscape: () => void
  onToggleMusic: () => void
  onChangeSoundscape: (sound: SoundscapeItem | null) => void
  onChangeMusic: (music: FocusMusicChoice | null) => void
}

interface GenreVideo {
  youtubeId: string
  title: string
  channel: string
}

export function FocusAudioControls({
  selectedSound,
  selectedMusic,
  soundscapePlaying,
  musicPlaying,
  onToggleSoundscape,
  onToggleMusic,
  onChangeSoundscape,
  onChangeMusic,
}: FocusAudioControlsProps) {
  const [soundVol, setSoundVol] = useState(100)
  const [musicVol, setMusicVol] = useState(80)
  const [showSoundPicker, setShowSoundPicker] = useState(false)
  const [showMusicPicker, setShowMusicPicker] = useState(false)
  const [musicCache, setMusicCache] = useState<Record<string, GenreVideo[]>>({})
  const musicFetchedRef = useRef(false)
  const homeAudio = useHomeAudioOptional()

  // Fetch music videos for genre picker
  useEffect(() => {
    if (musicFetchedRef.current) return
    musicFetchedRef.current = true
    Promise.allSettled(
      FOCUS_GENRES.map(async (genre) => {
        const res = await fetch(`/api/music-videos?genre=${genre.id}`)
        if (!res.ok) return { genreId: genre.id, videos: [] }
        const data = await res.json()
        return { genreId: genre.id, videos: (data.videos || []).slice(0, 5) }
      })
    ).then(results => {
      const cache: Record<string, GenreVideo[]> = {}
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.videos.length > 0) {
          cache[r.value.genreId] = r.value.videos
        }
      }
      setMusicCache(cache)
    })
  }, [])

  const handleSoundVolume = useCallback((val: number) => {
    setSoundVol(val)
    try {
      homeAudio?.refs.soundscapePlayerRef.current?.setVolume(val)
    } catch {}
  }, [homeAudio])

  const handleMusicVolume = useCallback((val: number) => {
    setMusicVol(val)
    try {
      homeAudio?.refs.bgPlayerRef.current?.setVolume(val)
    } catch {}
  }, [homeAudio])

  const handlePickMusic = useCallback((genre: typeof FOCUS_GENRES[number]) => {
    haptic('light')
    const videos = musicCache[genre.id]
    if (!videos || videos.length === 0) return
    const video = videos[Math.floor(Math.random() * videos.length)]
    onChangeMusic({
      genreId: genre.id,
      genreWord: genre.word,
      youtubeId: video.youtubeId,
      title: video.title,
      channel: video.channel,
      thumbnail: '',
    })
    setShowMusicPicker(false)
  }, [musicCache, onChangeMusic])

  const hasSound = !!selectedSound
  const hasMusic = !!selectedMusic

  return (
    <div className="border-t border-white/[0.06] pt-4 mt-2 space-y-3">
      {/* ─── Soundscape ─── */}
      <div className="space-y-2">
        <button
          onClick={() => { haptic('light'); setShowSoundPicker(p => !p) }}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-white/40 shrink-0" />
            <span className="text-xs text-white/90 uppercase tracking-wider">Soundscape</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/70">{hasSound ? selectedSound!.label : 'None'}</span>
            {showSoundPicker ? (
              <ChevronUp className="w-3 h-3 text-white/30" />
            ) : (
              <ChevronDown className="w-3 h-3 text-white/30" />
            )}
          </div>
        </button>

        {showSoundPicker && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-3 px-3">
            <button
              onClick={() => { haptic('light'); onChangeSoundscape(null); setShowSoundPicker(false) }}
              className="flex flex-col items-center gap-1 shrink-0"
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                !hasSound ? 'bg-white text-black' : 'bg-black border border-white/[0.12] text-white'
              }`}>
                <Volume2 className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <span className={`text-[9px] ${!hasSound ? 'text-white' : 'text-white'}`}>Off</span>
            </button>
            {FOCUS_SOUNDS.map((item) => {
              const Icon = item.icon
              const isActive = item.id === selectedSound?.id
              return (
                <button
                  key={item.id}
                  onClick={() => { onChangeSoundscape(item); setShowSoundPicker(false) }}
                  className="flex flex-col items-center gap-1 shrink-0"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isActive ? 'bg-white text-black' : 'bg-black border border-white/[0.12] text-white'
                  }`}>
                    <Icon className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <span className={`text-[9px] ${isActive ? 'text-white' : 'text-white'}`}>{item.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {hasSound && (
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              value={soundVol}
              onChange={(e) => handleSoundVolume(Number(e.target.value))}
              className="flex-1 h-1 rounded-full appearance-none bg-white/10 accent-white/70 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />
            <button
              onClick={() => { haptic('light'); onToggleSoundscape() }}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/8 hover:bg-white/15 transition-colors press-scale shrink-0"
            >
              {soundscapePlaying ? (
                <Pause className="w-3 h-3 text-white/70" fill="rgba(255,255,255,0.7)" />
              ) : (
                <Play className="w-3 h-3 text-white/70 ml-0.5" fill="rgba(255,255,255,0.7)" />
              )}
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-white/[0.06]" />

      {/* ─── Music ─── */}
      <div className="space-y-2">
        <button
          onClick={() => { haptic('light'); setShowMusicPicker(p => !p) }}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-white/40 shrink-0" />
            <span className="text-xs text-white/90 uppercase tracking-wider">Music</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/70">{hasMusic ? selectedMusic!.genreWord : 'None'}</span>
            {showMusicPicker ? (
              <ChevronUp className="w-3 h-3 text-white/30" />
            ) : (
              <ChevronDown className="w-3 h-3 text-white/30" />
            )}
          </div>
        </button>

        {showMusicPicker && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-3 px-3">
            <button
              onClick={() => { haptic('light'); onChangeMusic(null); setShowMusicPicker(false) }}
              className="flex flex-col items-center gap-1 shrink-0"
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                !hasMusic ? 'bg-white text-black' : 'bg-black border border-white/[0.12] text-white'
              }`}>
                <Music className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <span className={`text-[9px] ${!hasMusic ? 'text-white' : 'text-white'}`}>Off</span>
            </button>
            {FOCUS_GENRES.map((genre) => {
              const isActive = selectedMusic?.genreId === genre.id
              const hasVideos = !!musicCache[genre.id]
              return (
                <button
                  key={genre.id}
                  onClick={() => hasVideos && handlePickMusic(genre)}
                  disabled={!hasVideos}
                  className={`flex flex-col items-center gap-1 shrink-0 ${!hasVideos ? 'opacity-30' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isActive ? 'bg-white text-black' : 'bg-black border border-white/[0.12] text-white'
                  }`}>
                    <span className="text-[11px] font-medium">{genre.word.slice(0, 2)}</span>
                  </div>
                  <span className={`text-[9px] ${isActive ? 'text-white' : 'text-white'}`}>{genre.word}</span>
                </button>
              )
            })}
          </div>
        )}

        {hasMusic && (
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              value={musicVol}
              onChange={(e) => handleMusicVolume(Number(e.target.value))}
              className="flex-1 h-1 rounded-full appearance-none bg-white/10 accent-white/70 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />
            <button
              onClick={() => { haptic('light'); onToggleMusic() }}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/8 hover:bg-white/15 transition-colors press-scale shrink-0"
            >
              {musicPlaying ? (
                <Pause className="w-3 h-3 text-white/70" fill="rgba(255,255,255,0.7)" />
              ) : (
                <Play className="w-3 h-3 text-white/70 ml-0.5" fill="rgba(255,255,255,0.7)" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
