'use client'

/* ============================================================================
   /community — the public feed.
   Phase 2: For You / Following tabs + per-post profile links via PostCard.
   ============================================================================ */

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Sparkles, Send, EyeOff, RefreshCw } from 'lucide-react'
import { PostCard } from '@/components/social/PostCard'

interface Author { handle: string; display_name: string }
interface FeedPost {
  id: string
  body: string
  mindset_id: string | null
  anonymous: boolean
  created_at: string
  reaction_count: number
  comment_count: number
  is_own: boolean
  author: Author | null
  my_reactions: string[]
}

type Scope = 'all' | 'following'

export default function CommunityPage() {
  const [scope, setScope] = useState<Scope>('all')
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [isPosting, setIsPosting] = useState(false)

  const loadFeed = useCallback(async (s: Scope) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/social/feed?limit=30&scope=${s}`)
      if (!res.ok) throw new Error('feed fetch failed')
      const data = await res.json()
      setPosts(data.posts || [])
    } catch (err) {
      console.error('[community] feed load failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void loadFeed(scope) }, [loadFeed, scope])

  const submit = async () => {
    const body = draft.trim()
    if (!body || isPosting) return
    setIsPosting(true)
    try {
      const res = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, anonymous }),
      })
      if (!res.ok) throw new Error('post failed')
      setDraft('')
      await loadFeed(scope)
    } catch (err) {
      console.error('[community] post failed:', err)
    } finally {
      setIsPosting(false)
    }
  }

  return (
    <div className="min-h-screen text-white pb-24 lg:max-w-3xl lg:mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 px-6 pt-12 pb-3 bg-black">
        <div className="flex items-center justify-between mb-1.5">
          <h1 className="text-2xl font-bold tracking-tight">Community</h1>
          <button
            onClick={() => void loadFeed(scope)}
            aria-label="Refresh"
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <p className="text-xs text-white/55 mb-3">Share a reflection. Read others. Send strength.</p>

        {/* Feed scope tabs */}
        <div className="flex gap-1 p-0.5 rounded-lg bg-white/[0.06]">
          {[
            { id: 'all' as Scope, label: 'For You' },
            { id: 'following' as Scope, label: 'Following' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setScope(tab.id)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all press-scale ${
                scope === tab.id ? 'bg-white/20 text-white shadow-sm' : 'text-white/70 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Composer */}
      <div className="px-6 pt-4">
        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Share what's been on your mind…"
            rows={3}
            maxLength={1200}
            className="w-full bg-transparent text-[15px] text-white placeholder-white/40 caret-white focus:outline-none resize-none"
          />
          <div className="mt-2 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="accent-white"
              />
              <EyeOff className="w-3.5 h-3.5" />
              Post anonymously
            </label>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-white/40">{draft.length}/1200</span>
              <button
                onClick={submit}
                disabled={!draft.trim() || isPosting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-black text-sm font-semibold disabled:opacity-40 hover:bg-white/90 transition-colors press-scale"
              >
                {isPosting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="px-6 pt-6 space-y-3">
        {isLoading && posts.length === 0 && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 text-white/60 animate-spin" />
          </div>
        )}

        {!isLoading && posts.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="w-8 h-8 text-white/30 mx-auto mb-3" />
            <p className="text-sm text-white/70">
              {scope === 'following' ? 'Follow some people to see their posts here.' : 'No posts yet. Be the first.'}
            </p>
          </div>
        )}

        {posts.map(post => <PostCard key={post.id} post={post} />)}
      </div>
    </div>
  )
}
