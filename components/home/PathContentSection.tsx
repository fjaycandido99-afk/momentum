'use client'

import { useMemo } from 'react'
import { Compass } from 'lucide-react'
import type { MindsetId } from '@/lib/mindset/types'
import type { VideoItem } from './home-types'
import { MINDSET_TOPIC_MAP } from '@/lib/smart-home-feed'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'

interface PathContentSectionProps {
  mindsetId: MindsetId
  motivationByTopic: Record<string, VideoItem[]>
  backgrounds: string[]
  activeCardId: string | null
  tappedCardId: string | null
  musicPlaying: boolean
  onPlay: (video: VideoItem, index: number, topic: string) => void
  onMagneticMove: (e: React.PointerEvent<any>) => void
  onMagneticLeave: (e: React.PointerEvent<any>) => void
  onRipple: (e: React.MouseEvent<any>) => void
}

export function PathContentSection({
  mindsetId,
  motivationByTopic,
  backgrounds,
  activeCardId,
  tappedCardId,
  musicPlaying,
  onPlay,
  onMagneticMove,
  onMagneticLeave,
  onRipple,
}: PathContentSectionProps) {
  const config = MINDSET_CONFIGS[mindsetId]
  const pathTopics = MINDSET_TOPIC_MAP[mindsetId]

  // Find videos matching path topics that aren't the daily featured topic
  const pathVideos = useMemo(() => {
    for (const topic of pathTopics) {
      const videos = motivationByTopic[topic]
      if (videos && videos.length > 0) {
        return { topic, videos: videos.slice(0, 4) }
      }
    }
    return null
  }, [pathTopics, motivationByTopic])

  if (!pathVideos) return null

  return (
    <div className="px-6 mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Compass className="w-4 h-4 text-white/70" />
        <h3 className="text-base font-medium text-white">For Your {config.name} Path</h3>
      </div>
      <p className="text-xs text-white/60 mb-4">
        {pathTopics.join(' · ')} — curated for your mindset
      </p>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {pathVideos.videos.map((video, i) => {
          const bg = backgrounds[(i + 10) % backgrounds.length]
          const isActive = activeCardId === video.id && musicPlaying

          return (
            <button
              key={video.id}
              onClick={(e) => {
                onRipple(e)
                onPlay(video, i, pathVideos.topic)
              }}
              onPointerMove={onMagneticMove}
              onPointerLeave={onMagneticLeave}
              className={`relative shrink-0 w-36 h-28 rounded-xl overflow-hidden border press-scale transition-all bg-black ${
                isActive ? 'border-white/30 scale-[1.02]' : 'border-white/15'
              } ${tappedCardId === video.id ? 'scale-95' : ''}`}
            >
              {bg && <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
              <div className="relative z-10 p-3 flex flex-col justify-end h-full">
                <p className="text-[11px] text-white line-clamp-2 leading-tight">{video.title}</p>
              </div>
              {isActive && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white/80 animate-pulse" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
