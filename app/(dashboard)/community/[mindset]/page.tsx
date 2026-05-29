'use client'

/* ============================================================================
   /community/[mindset] — mindset-filtered feed.
   Same UI as /community but pre-filters posts by the URL mindset.
   ============================================================================ */

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, Loader2, Sparkles, RefreshCw } from 'lucide-react'
import { PostCard } from '@/components/social/PostCard'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'
import type { MindsetId } from '@/lib/mindset/types'
import type { CrisisRegion } from '@/lib/social/crisis-detect'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Post = any

// Next 14.2: params on client components is a plain object, NOT a
// Promise. The use(params) pattern is for Next 15 forward-compat —
// here it throws.
export default function MindsetFeedPage({ params }: { params: { mindset: string } }) {
  const raw = params.mindset
  const mindsetId = raw.toLowerCase() as MindsetId
  const config = MINDSET_CONFIGS[mindsetId]
  const [crisisRegion, setCrisisRegion] = useState<CrisisRegion>('US')

  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/social/feed?limit=30&mindset=${mindsetId}`)
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || [])
        if (data.crisis_region) setCrisisRegion(data.crisis_region)
      }
    } finally {
      setIsLoading(false)
    }
  }, [mindsetId])

  useEffect(() => { void load() }, [load])

  if (!config) {
    return (
      <div className="min-h-screen text-white pb-24 lg:max-w-3xl lg:mx-auto px-6 pt-16 text-center">
        <p className="text-lg">Unknown mindset: {raw}</p>
        <Link href="/community" className="inline-block mt-4 text-sm text-white/60 hover:text-white">← Back</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white pb-24 lg:max-w-5xl lg:mx-auto xl:max-w-3xl xl:mx-0 xl:ml-12 xl:mr-[336px]">
      <div className="sticky top-0 z-20 px-6 pt-12 pb-3 bg-black">
        <Link href="/community" className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white mb-2">
          <ChevronLeft className="w-3 h-3" /> All community
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="mr-2">{config.icon}</span>{config.name}
            </h1>
            <p className="text-xs text-white/55 mt-1">Reflections from {config.name} minds.</p>
          </div>
          <button onClick={() => void load()} aria-label="Refresh" className="p-1.5 rounded-full hover:bg-white/10">
            <RefreshCw className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>

      <div className="px-6 pt-6 space-y-3">
        {isLoading && posts.length === 0 && (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-white/60 animate-spin" /></div>
        )}
        {!isLoading && posts.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="w-8 h-8 text-white/30 mx-auto mb-3" />
            <p className="text-sm text-white/70">No {config.name} reflections yet. Be the first.</p>
          </div>
        )}
        {posts.map(p => <PostCard key={p.id} post={p} crisisRegion={crisisRegion} />)}
      </div>
    </div>
  )
}
