'use client'

/* ============================================================================
   /community — the public feed.

   Phase 1 surface: composer at the top (write a reflection to share, with
   anonymous toggle) + reverse-chronological feed below. Reactions are
   compassion-leaning ("❤️ heart", "🫶 felt", "💪 strength") to nudge tone
   away from approval/comparison and toward solidarity.

   Profiles + follows + comments will layer in Phase 2 — this page already
   reads the my_reactions[] state per post and renders author handles so
   the upgrade to /user/[handle] is just a click target.
   ============================================================================ */

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Heart, Sparkles, Send, EyeOff, RefreshCw } from 'lucide-react'

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

const REACTION_KINDS: { kind: 'heart' | 'felt' | 'strength'; emoji: string; label: string }[] = [
  { kind: 'heart',    emoji: '❤️', label: 'Heart' },
  { kind: 'felt',     emoji: '🫶', label: 'Felt this' },
  { kind: 'strength', emoji: '💪', label: 'Strength' },
]

function formatRelative(iso: string): string {
  const dt = new Date(iso)
  const diffMs = Date.now() - dt.getTime()
  const min = Math.floor(diffMs / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [isPosting, setIsPosting] = useState(false)

  const loadFeed = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/social/feed?limit=30')
      if (!res.ok) throw new Error('feed fetch failed')
      const data = await res.json()
      setPosts(data.posts || [])
    } catch (err) {
      console.error('[community] feed load failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void loadFeed() }, [loadFeed])

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
      await loadFeed()
    } catch (err) {
      console.error('[community] post failed:', err)
    } finally {
      setIsPosting(false)
    }
  }

  const react = async (postId: string, kind: 'heart' | 'felt' | 'strength') => {
    // Optimistic toggle.
    setPosts(curr => curr.map(p => {
      if (p.id !== postId) return p
      const has = p.my_reactions.includes(kind)
      return {
        ...p,
        my_reactions: has ? p.my_reactions.filter(k => k !== kind) : [...p.my_reactions, kind],
        reaction_count: has ? Math.max(0, p.reaction_count - 1) : p.reaction_count + 1,
      }
    }))
    try {
      const res = await fetch(`/api/social/posts/${postId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      })
      if (!res.ok) {
        // Revert on failure.
        setPosts(curr => curr.map(p => {
          if (p.id !== postId) return p
          const has = p.my_reactions.includes(kind)
          return {
            ...p,
            my_reactions: has ? p.my_reactions.filter(k => k !== kind) : [...p.my_reactions, kind],
            reaction_count: has ? Math.max(0, p.reaction_count - 1) : p.reaction_count + 1,
          }
        }))
      } else {
        const data = await res.json()
        // Reconcile count with server truth.
        setPosts(curr => curr.map(p => p.id === postId ? { ...p, reaction_count: data.reaction_count } : p))
      }
    } catch {
      /* network — keep optimistic state, will resync on refresh */
    }
  }

  return (
    <div className="min-h-screen text-white pb-24 lg:max-w-3xl lg:mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 px-6 pt-12 pb-3 bg-black">
        <div className="flex items-center justify-between mb-1.5">
          <h1 className="text-2xl font-bold tracking-tight">Community</h1>
          <button
            onClick={() => void loadFeed()}
            aria-label="Refresh"
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <p className="text-xs text-white/55">Share a reflection. Read others. Send strength.</p>
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
            <p className="text-sm text-white/70">No posts yet. Be the first.</p>
          </div>
        )}

        {posts.map(post => (
          <article key={post.id} className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
            {/* Author + time */}
            <div className="flex items-center gap-2 mb-2">
              {post.author ? (
                <>
                  <div className="w-7 h-7 rounded-full bg-white/10 grid place-items-center text-[11px] font-semibold text-white/80">
                    {post.author.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-white leading-tight truncate">
                      {post.author.display_name}
                      {post.is_own && <span className="ml-1.5 text-[10px] text-white/45">(you)</span>}
                    </div>
                    <div className="text-[11px] text-white/45 leading-tight">@{post.author.handle}</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-7 h-7 rounded-full bg-white/10 grid place-items-center">
                    <EyeOff className="w-3.5 h-3.5 text-white/60" />
                  </div>
                  <div className="text-[13px] font-medium text-white/70">Anonymous</div>
                </>
              )}
              <span className="ml-auto text-[11px] text-white/45">{formatRelative(post.created_at)}</span>
            </div>

            {/* Body */}
            <p className="text-[15px] text-white/90 leading-relaxed whitespace-pre-wrap">{post.body}</p>

            {/* Reactions */}
            <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-1">
              {REACTION_KINDS.map(r => {
                const active = post.my_reactions.includes(r.kind)
                return (
                  <button
                    key={r.kind}
                    onClick={() => void react(post.id, r.kind)}
                    aria-label={r.label}
                    title={r.label}
                    className={`px-2.5 py-1 rounded-full text-xs transition-colors press-scale ${
                      active
                        ? 'bg-white/[0.14] text-white'
                        : 'text-white/55 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    {r.emoji}
                  </button>
                )
              })}
              {post.reaction_count > 0 && (
                <span className="ml-2 text-xs text-white/50 inline-flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  {post.reaction_count}
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
