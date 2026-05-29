'use client'

/* ============================================================================
   PostCard — a single feed/profile post with reactions.
   Pulled out of /community page so /user/[handle] can reuse it.
   ============================================================================ */

import Link from 'next/link'
import { useState } from 'react'
import { EyeOff, Heart } from 'lucide-react'

interface Author { handle: string; display_name: string }
interface PostShape {
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

export function PostCard({ post: initial }: { post: PostShape }) {
  const [post, setPost] = useState<PostShape>(initial)

  const react = async (kind: 'heart' | 'felt' | 'strength') => {
    const has = post.my_reactions.includes(kind)
    // Optimistic
    setPost(p => ({
      ...p,
      my_reactions: has ? p.my_reactions.filter(k => k !== kind) : [...p.my_reactions, kind],
      reaction_count: has ? Math.max(0, p.reaction_count - 1) : p.reaction_count + 1,
    }))
    try {
      const res = await fetch(`/api/social/posts/${post.id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      })
      if (res.ok) {
        const data = await res.json()
        setPost(p => ({ ...p, reaction_count: data.reaction_count }))
      } else {
        // Revert on failure
        setPost(p => ({
          ...p,
          my_reactions: has ? [...p.my_reactions, kind] : p.my_reactions.filter(k => k !== kind),
          reaction_count: has ? p.reaction_count + 1 : Math.max(0, p.reaction_count - 1),
        }))
      }
    } catch {
      /* keep optimistic state */
    }
  }

  return (
    <article className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
      {/* Author row */}
      <div className="flex items-center gap-2 mb-2">
        {post.author ? (
          <>
            <Link
              href={`/user/${post.author.handle}`}
              className="w-7 h-7 rounded-full bg-white/10 grid place-items-center text-[11px] font-semibold text-white/80 hover:bg-white/15 transition-colors"
            >
              {post.author.display_name.charAt(0).toUpperCase()}
            </Link>
            <Link href={`/user/${post.author.handle}`} className="min-w-0 group">
              <div className="text-[13px] font-medium text-white leading-tight truncate group-hover:underline">
                {post.author.display_name}
                {post.is_own && <span className="ml-1.5 text-[10px] text-white/45">(you)</span>}
              </div>
              <div className="text-[11px] text-white/45 leading-tight">@{post.author.handle}</div>
            </Link>
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

      <p className="text-[15px] text-white/90 leading-relaxed whitespace-pre-wrap">{post.body}</p>

      <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-1">
        {REACTION_KINDS.map(r => {
          const active = post.my_reactions.includes(r.kind)
          return (
            <button
              key={r.kind}
              onClick={() => void react(r.kind)}
              aria-label={r.label}
              title={r.label}
              className={`px-2.5 py-1 rounded-full text-xs transition-colors press-scale ${
                active ? 'bg-white/[0.14] text-white' : 'text-white/55 hover:text-white hover:bg-white/[0.08]'
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
  )
}
