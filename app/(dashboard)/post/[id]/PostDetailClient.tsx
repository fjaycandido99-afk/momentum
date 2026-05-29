'use client'

/* ============================================================================
   PostDetailClient — interactive body of /post/[id]. The server wrapper
   in page.tsx handles auth-free generateMetadata for OG previews; this
   client component handles the fetch + render for the logged-in viewer.
   ============================================================================ */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { PostCard } from '@/components/social/PostCard'
import type { CrisisRegion } from '@/lib/social/crisis-detect'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Post = any

export function PostDetailClient({ id }: { id: string }) {
  const [post, setPost] = useState<Post | null>(null)
  const [crisisRegion, setCrisisRegion] = useState<CrisisRegion>('US')
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/social/posts/${id}`)
        if (res.status === 404) { if (!cancelled) setNotFound(true); return }
        if (!res.ok) throw new Error('load failed')
        const data = await res.json()
        if (!cancelled) {
          setPost(data.post)
          if (data.crisis_region) setCrisisRegion(data.crisis_region)
        }
      } catch (err) {
        console.error('[post] load failed:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  if (notFound) {
    return (
      <div className="min-h-screen text-white pb-24 lg:max-w-3xl lg:mx-auto px-6 pt-16 text-center">
        <p className="text-lg">Post not found</p>
        <Link href="/community" className="inline-block mt-4 text-sm text-white/60 hover:text-white">← Back to community</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white pb-24">
      <div className="px-6 pt-12 pb-3">
        <Link href="/community" className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white">
          <ChevronLeft className="w-4 h-4" /> Community
        </Link>
      </div>
      <div className="px-6">
        {isLoading && (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-white/60 animate-spin" /></div>
        )}
        {post && <PostCard post={post} crisisRegion={crisisRegion} />}
      </div>
    </div>
  )
}
