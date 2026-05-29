'use client'

/* ============================================================================
   PostCard — single post with reactions, comments, report, crisis banner.
   Phase 3 additions: inline comment thread, report-flow menu, crisis-
   resource banner on crisis_level posts.
   ============================================================================ */

import Link from 'next/link'
import { useEffect, useRef, useState, useCallback } from 'react'
import { EyeOff, Heart, MessageCircle, MoreHorizontal, Flag, Loader2, Send, AlertTriangle, BookOpen, Bookmark, BookmarkCheck, Quote, CornerUpLeft, Eye, Ban } from 'lucide-react'
import { crisisResourceForLevel, type CrisisRegion } from '@/lib/social/crisis-detect'
import { getMindsetStyle, getMoodTint } from '@/lib/social/mindset-style'

interface Author { handle: string; display_name: string }
interface ReplyParent { id: string; excerpt: string; author: Author | null }
interface PostShape {
  id: string
  body: string
  /// AI-extracted most-resonant sentence — rendered as the pulled
  /// quote at the top of the card when present.
  essence?: string | null
  /// AI theme chips (gratitude / growth / doubt / …).
  themes?: string[]
  /// AI-surfaced related quote from a real thinker.
  echo_quote?: string | null
  echo_attribution?: string | null
  /// AI-synthesized meta-lesson — distinct from essence (verbatim). The
  /// crystallized punchline + one-line elaboration.
  lesson_title?: string | null
  lesson_body?: string | null
  mindset_id: string | null
  anonymous: boolean
  created_at: string
  reaction_count: number
  comment_count: number
  crisis_level?: string | null
  source_entry_id?: string | null
  /// Mood the user was in — drives the mood chip on the card.
  mood?: string | null
  /// Soft-validation footer counts.
  view_count?: number
  relate_count?: number
  /// Quote-reply parent payload — body excerpt + author chip.
  reply_to?: ReplyParent | null
  is_own: boolean
  author: Author | null
  my_reactions: string[]
}

interface CommentShape {
  id: string
  body: string
  created_at: string
  is_own: boolean
  author: Author
}

// Reactions reframed for journal-sharing: heart for general care, relate
// for "I've been there", learn for "I took something from this." Matches
// how people actually engage with someone else's reflection vs a generic
// "post."
const REACTION_KINDS: { kind: 'heart' | 'relate' | 'learn'; emoji: string; label: string }[] = [
  { kind: 'heart',  emoji: '❤️', label: 'Heart' },
  { kind: 'relate', emoji: '🪞', label: 'I relate' },
  { kind: 'learn',  emoji: '🌱', label: 'I learned from this' },
]

const REPORT_REASONS: { value: string; label: string }[] = [
  { value: 'abuse',             label: 'Abuse or harassment' },
  { value: 'spam',              label: 'Spam' },
  { value: 'off_topic',         label: 'Off-topic' },
  { value: 'self_harm_concern', label: "I'm worried about this person" },
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

export function PostCard({ post: initial, crisisRegion = 'US' }: { post: PostShape; crisisRegion?: CrisisRegion }) {
  const [post, setPost] = useState<PostShape>(initial)

  const [commentsOpen, setCommentsOpen] = useState(false)
  const [comments, setComments] = useState<CommentShape[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [commentPosting, setCommentPosting] = useState(false)
  const [commentError, setCommentError] = useState('')

  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  // Locally hide a post when the user blocks its author — feels
  // immediate, no waiting for a feed refetch.
  const [hidden, setHidden] = useState(false)
  const [reportReason, setReportReason] = useState('abuse')
  const [reportNotes, setReportNotes] = useState('')
  const [reportSent, setReportSent] = useState(false)

  // AI-suggested comment openers — fetched once when the comments
  // section opens, cached for the session. Tapping a chip populates
  // the input but doesn't auto-send.
  const [suggestions, setSuggestions] = useState<string[]>([])
  const suggestionsLoadedRef = useRef(false)

  const [bookmarked, setBookmarked] = useState(false)
  const [bookmarkBusy, setBookmarkBusy] = useState(false)

  // Reply-with-my-own composer state.
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyDraft, setReplyDraft] = useState('')
  const [replyAnon, setReplyAnon] = useState(false)
  const [replyPosting, setReplyPosting] = useState(false)
  const [replySent, setReplySent] = useState(false)

  // View tracking — fires once per (post, session). sessionStorage
  // keys it so refreshing or navigating away+back doesn't double-count.
  const viewFiredRef = useRef(false)
  useEffect(() => {
    if (post.is_own || viewFiredRef.current) return
    if (typeof window === 'undefined') return
    const key = `voxu.viewed.${post.id}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch { /* private mode */ }
    viewFiredRef.current = true
    // Fire-and-forget — server enforces "not own" too.
    void fetch(`/api/social/posts/${post.id}/view`, { method: 'POST' }).catch(() => {})
  }, [post.id, post.is_own])

  const submitReply = async () => {
    const text = replyDraft.trim()
    if (!text || replyPosting) return
    setReplyPosting(true)
    try {
      const res = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: text,
          anonymous: replyAnon,
          replyToPostId: post.id,
        }),
      })
      if (res.ok) {
        setReplySent(true)
        setTimeout(() => { setReplyOpen(false); setReplyDraft(''); setReplySent(false); setReplyAnon(false) }, 1400)
      }
    } finally {
      setReplyPosting(false)
    }
  }

  const saveReflection = async () => {
    if (post.is_own || bookmarked || bookmarkBusy) return
    setBookmarkBusy(true)
    // Optimistic flip — keeps UI snappy even if the favorites API is slow.
    setBookmarked(true)
    try {
      const who = post.author?.display_name || (post.anonymous ? 'Anonymous' : 'Someone')
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: 'reflection',
          content_text: post.body,
          content_id: `social:${post.id}`,
          content_title: `Reflection from ${who}`,
        }),
      })
      if (!res.ok) setBookmarked(false)
    } catch {
      setBookmarked(false)
    } finally {
      setBookmarkBusy(false)
    }
  }

  const crisisResource = crisisResourceForLevel((post.crisis_level as 'urgent' | 'concern' | null) || null, crisisRegion)
  // Visual signature derived from the post's mindset + mood — gives each
  // card a distinctive feel so the feed reads as a varied tapestry, not a
  // wall of identical text blocks. See lib/social/mindset-style.ts.
  const mindsetStyle = getMindsetStyle(post.mindset_id)
  const moodTint = getMoodTint(post.mood)
  // Strip the essence sentence out of the body so we don't render it
  // twice (once as pulled quote, once buried in the body). Falls back
  // gracefully when there's no essence or it's not found in the body.
  const essence = post.essence?.trim() || null
  const bodyWithoutEssence = essence
    ? post.body.replace(essence, '').replace(/\s+/g, ' ').replace(/^[\s.,—–-]+|[\s.,—–-]+$/g, '').trim()
    : post.body
  const commentsLocked = post.crisis_level === 'urgent'

  const react = async (kind: 'heart' | 'relate' | 'learn') => {
    const has = post.my_reactions.includes(kind)
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
        setPost(p => ({
          ...p,
          my_reactions: has ? [...p.my_reactions, kind] : p.my_reactions.filter(k => k !== kind),
          reaction_count: has ? p.reaction_count + 1 : Math.max(0, p.reaction_count - 1),
        }))
      }
    } catch { /* keep optimistic */ }
  }

  const loadComments = useCallback(async () => {
    setCommentsLoading(true)
    try {
      const res = await fetch(`/api/social/posts/${post.id}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(data.comments || [])
      }
    } finally {
      setCommentsLoading(false)
    }
  }, [post.id])

  const loadSuggestions = useCallback(async () => {
    if (suggestionsLoadedRef.current || post.is_own) return
    suggestionsLoadedRef.current = true
    try {
      const res = await fetch(`/api/social/posts/${post.id}/comment-suggestions`)
      if (res.ok) {
        const data = await res.json()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setSuggestions((data.suggestions || []).map((s: any) => s.text).filter(Boolean))
      }
    } catch { /* silent — fallbacks are server-side */ }
  }, [post.id, post.is_own])

  const toggleComments = () => {
    setCommentsOpen(o => {
      const next = !o
      if (next && comments.length === 0) void loadComments()
      if (next) void loadSuggestions()
      return next
    })
  }

  const submitComment = async () => {
    const text = commentDraft.trim()
    if (!text || commentPosting) return
    setCommentError('')
    setCommentPosting(true)
    try {
      const res = await fetch(`/api/social/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      })
      if (res.ok) {
        setCommentDraft('')
        setPost(p => ({ ...p, comment_count: p.comment_count + 1 }))
        await loadComments()
      } else {
        const data = await res.json()
        setCommentError(data.error || 'Could not post.')
      }
    } finally {
      setCommentPosting(false)
    }
  }

  const submitReport = async () => {
    setReportSent(false)
    try {
      const res = await fetch('/api/social/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: 'post',
          target_id: post.id,
          reason: reportReason,
          notes: reportNotes,
        }),
      })
      if (res.ok) {
        setReportSent(true)
        setTimeout(() => { setReportOpen(false); setReportSent(false); setReportNotes('') }, 1400)
      }
    } catch {}
  }

  const blockAuthor = async () => {
    if (!post.author) return
    if (!confirm(`Block @${post.author.handle}? You won't see their posts and they won't see yours.`)) return
    setMenuOpen(false)
    setHidden(true) // optimistic — vanish immediately
    try {
      await fetch('/api/social/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: post.author.handle }),
      })
    } catch {
      // revert on failure
      setHidden(false)
    }
  }

  if (hidden) return null

  return (
    <article
      className={`relative p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden ${mindsetStyle.borderClass}`}
    >
      {/* Aura layer — mindset glow (top-left) stacked on mood tint
          (top-right), pulled into its own absolute layer so the breath
          animation modulates ONLY the atmosphere, not the text + buttons
          above. pointer-events-none so it never eats clicks. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none post-aura-breathe"
        style={{
          backgroundImage: `${mindsetStyle.glowGradient}, ${moodTint}`,
        }}
      />
      <div className="relative">{/* z-stack content above the aura */}
      {/* Author row */}
      <div className="flex items-center gap-2 mb-2">
        {post.author ? (
          <>
            <Link
              href={`/user/${post.author.handle}`}
              className={`w-7 h-7 rounded-full bg-white/10 grid place-items-center text-[11px] font-semibold text-white/80 hover:bg-white/15 transition-colors ring-2 ring-offset-0 ${mindsetStyle.avatarRing}`}
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
        {!post.is_own && (
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label="More"
            className="p-1 rounded-full hover:bg-white/10 transition-colors -mr-1"
          >
            <MoreHorizontal className="w-3.5 h-3.5 text-white/55" />
          </button>
        )}
      </div>

      {/* Crisis-resource banner — surfaces when crisis_level is set on the post.
          Pinned at the top of the post body so anyone reading sees support
          options before reacting. */}
      {crisisResource && (
        <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-400/25">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-200/90">{crisisResource.headline}</span>
          </div>
          <p className="text-[13px] text-white/85 leading-relaxed mb-2">{crisisResource.body}</p>
          <ul className="space-y-1">
            {crisisResource.resources.map(r => (
              <li key={r.label}>
                <a
                  href={r.href}
                  target={r.href.startsWith('http') ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className="text-[12px] text-amber-200 hover:text-white underline underline-offset-2"
                >
                  {r.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Context row — surfaces the post's frame (journal source, mood,
          mindset) so readers can scan the kind of reflection at a glance. */}
      {(post.source_entry_id || post.mood || post.mindset_id) && (
        <div className="flex items-center flex-wrap gap-2 mb-2 text-[10.5px]">
          {post.source_entry_id && (
            <span className="inline-flex items-center gap-1 text-white/55">
              <BookOpen className="w-3 h-3" />
              <span className="uppercase tracking-wider">Journal entry</span>
            </span>
          )}
          {post.mood && (
            <span className="px-2 py-0.5 rounded-full bg-white/[0.05] text-white/65 capitalize">
              feeling {post.mood}
            </span>
          )}
          {(post.themes || []).slice(0, 2).map(t => (
            <span key={t} className="px-2 py-0.5 rounded-full bg-white/[0.04] text-white/55 lowercase">
              #{t}
            </span>
          ))}
          {post.mindset_id && (
            <Link
              href={`/community/${post.mindset_id}`}
              className={`ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full border uppercase tracking-wider hover:brightness-125 transition-all ${mindsetStyle.chipClass}`}
            >
              <span>{post.mindset_id}</span>
              {mindsetStyle.vibe && (
                <span className="hidden lg:inline text-[8.5px] opacity-60 normal-case tracking-normal">· {mindsetStyle.vibe}</span>
              )}
            </Link>
          )}
        </div>
      )}

      {/* Quote-reply parent — shown when this post replies to another.
          Tap to jump to the source post for full context. */}
      {post.reply_to && (
        <Link
          href={`/post/${post.reply_to.id}`}
          className="block mb-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] transition-colors"
        >
          <div className="flex items-center gap-1.5 text-[10.5px] text-white/55 mb-1">
            <Quote className="w-3 h-3" />
            <span>Replying to {post.reply_to.author ? `@${post.reply_to.author.handle}` : 'Anonymous'}</span>
          </div>
          <p className="text-[12.5px] text-white/70 leading-snug line-clamp-2 italic">&ldquo;{post.reply_to.excerpt}&rdquo;</p>
        </Link>
      )}

      {/* Essence — the AI-extracted most-resonant sentence, rendered
          big and italic as a pulled quote. Sets the emotional tone of
          the card; the supporting body below is the context that led
          to it. */}
      {essence ? (
        <>
          <p className="text-[17px] lg:text-[19px] leading-snug text-white font-medium italic mb-2">
            &ldquo;{essence}&rdquo;
          </p>
          {bodyWithoutEssence && (
            <p className="text-[13.5px] text-white/65 leading-relaxed whitespace-pre-wrap">{bodyWithoutEssence}</p>
          )}
        </>
      ) : (
        <p className="text-[15px] text-white/90 leading-relaxed whitespace-pre-wrap">{post.body}</p>
      )}

      {/* Soft-validation footer — "247 read · 18 related". Author-only
          counts (we never show "X people viewed your post" to others —
          that's stalker-vibe energy). Comment count lives in the action
          row below. */}
      {post.is_own && ((post.view_count ?? 0) > 0 || (post.relate_count ?? 0) > 0) && (
        <div className="mt-2 flex items-center gap-3 text-[11px] text-white/45">
          {(post.view_count ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {post.view_count} read
            </span>
          )}
          {(post.relate_count ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1">🪞 {post.relate_count} related</span>
          )}
        </div>
      )}

      {/* AI Lesson — synthesized crystallization of the post's meta-insight.
          Distinct visual treatment (gradient bg + sparkle eyebrow) so each
          post gets a different shape, breaking the wall-of-text feeling. */}
      {post.lesson_title && post.lesson_body && (
        <div
          className="mt-3 p-3.5 rounded-xl border border-white/[0.12] relative overflow-hidden"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
          }}
        >
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/55 mb-1.5">
            <span>✦</span>
            <span>Lesson</span>
          </div>
          <p className="text-[15px] font-medium text-white leading-snug">
            {post.lesson_title}.
          </p>
          <p className="text-[13px] text-white/70 leading-relaxed mt-1">
            {post.lesson_body}
          </p>
        </div>
      )}

      {/* AI Echo — a real-thinker quote that resonates with this post.
          Rendered as a subtle "Echoes" companion line so it reads as a
          gentle "this reminds me of…" rather than an authoritative
          interjection. */}
      {post.echo_quote && post.echo_attribution && (
        <div className="mt-3 pt-3 border-t border-white/[0.05] flex gap-2 items-start">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/35 mt-0.5 shrink-0">Echoes</span>
          <div className="min-w-0">
            <p className="text-[13px] text-white/65 italic leading-snug">
              &ldquo;{post.echo_quote}&rdquo;
            </p>
            <p className="text-[11px] text-white/40 mt-0.5">— {post.echo_attribution}</p>
          </div>
        </div>
      )}

      {/* Reactions + comment toggle */}
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
        <button
          onClick={toggleComments}
          aria-label="Comments"
          className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-white/55 hover:text-white hover:bg-white/[0.08] transition-colors"
        >
          <MessageCircle className="w-3 h-3" />
          {post.comment_count}
        </button>
        {!post.is_own && (
          <>
            <button
              onClick={() => setReplyOpen(o => !o)}
              aria-label="Reply with my reflection"
              title="Reply with my own reflection"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-white/55 hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              <CornerUpLeft className="w-3 h-3" />
            </button>
            <button
              onClick={() => void saveReflection()}
              disabled={bookmarked || bookmarkBusy}
              aria-label={bookmarked ? 'Saved' : 'Save reflection'}
              title={bookmarked ? 'Saved to your library' : 'Save reflection to my library'}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors ${
                bookmarked ? 'text-white bg-white/[0.10]' : 'text-white/55 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {bookmarked ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
            </button>
          </>
        )}
      </div>

      {/* Reply composer — appears when ↩ tapped. Posts as a new SocialPost
          with reply_to_post_id set, so it shows in the feed as a quote-reply. */}
      {replyOpen && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          {replySent ? (
            <p className="text-xs text-white/70 italic">Posted. ✨</p>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-[10.5px] text-white/55 mb-1.5">
                <Quote className="w-3 h-3" />
                Reply with your own reflection
              </div>
              <textarea
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                rows={3}
                maxLength={1200}
                placeholder="What did this bring up for you?"
                className="w-full bg-white/[0.05] border border-white/15 rounded-lg px-3 py-2 text-[13.5px] text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 resize-none"
              />
              <div className="mt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={replyAnon}
                    onChange={(e) => setReplyAnon(e.target.checked)}
                    className="accent-white"
                  />
                  Anonymously
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setReplyOpen(false)}
                    className="px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-xs text-white/80"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void submitReply()}
                    disabled={!replyDraft.trim() || replyPosting}
                    className="inline-flex items-center gap-1 px-4 py-1 rounded-full bg-white text-black text-xs font-semibold disabled:opacity-40 hover:bg-white/95"
                  >
                    {replyPosting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Post reply
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Comments section */}
      {commentsOpen && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-3">
          {commentsLoading && (
            <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 text-white/60 animate-spin" /></div>
          )}
          {!commentsLoading && comments.length === 0 && (
            <p className="text-xs text-white/50 italic text-center py-1">
              {commentsLocked ? 'Comments are paused while we make sure this post has the right support.' : 'No comments yet.'}
            </p>
          )}
          {comments.map(c => (
            <div key={c.id} className="flex items-start gap-2">
              <Link
                href={`/user/${c.author.handle}`}
                className="w-6 h-6 rounded-full bg-white/10 grid place-items-center text-[10px] font-semibold text-white/80 shrink-0"
              >
                {c.author.display_name.charAt(0).toUpperCase()}
              </Link>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-white/55 mb-0.5">
                  <Link href={`/user/${c.author.handle}`} className="text-white/85 hover:underline">{c.author.display_name}</Link>
                  <span className="ml-1.5">{formatRelative(c.created_at)}</span>
                </div>
                <p className="text-[13.5px] text-white/90 leading-relaxed whitespace-pre-wrap">{c.body}</p>
              </div>
            </div>
          ))}
          {/* AI-suggested compassionate openers — tap to populate input.
              Hidden once the user starts typing or sends their first
              comment so we don't crowd the conversation. */}
          {!commentsLocked && suggestions.length > 0 && !commentDraft.trim() && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setCommentDraft(s)}
                  className="px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.08] text-[11.5px] text-white/70 hover:text-white transition-colors text-left max-w-full"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Composer */}
          {!commentsLocked && (
            <div className="flex items-end gap-2 pt-1">
              <textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                rows={1}
                maxLength={600}
                placeholder="Leave a comment…"
                className="flex-1 bg-white/[0.05] border border-white/15 rounded-xl px-3 py-2 text-[13px] text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 resize-none"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submitComment() } }}
              />
              <button
                onClick={() => void submitComment()}
                disabled={!commentDraft.trim() || commentPosting}
                className="p-2 rounded-full bg-white text-black disabled:opacity-40 hover:bg-white/95"
                aria-label="Send"
              >
                {commentPosting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
          {commentError && <p className="text-[11px] text-red-300">{commentError}</p>}
        </div>
      )}

      {/* Action menu */}
      {menuOpen && (
        <>
          <button
            aria-label="Close"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute top-10 right-3 z-50 min-w-[180px] py-1 rounded-xl bg-black border border-white/15 shadow-xl">
            <button
              onClick={() => { setMenuOpen(false); setReportOpen(true) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/85 hover:bg-white/5"
            >
              <Flag className="w-3 h-3" /> Report
            </button>
            {post.author && (
              <button
                onClick={() => void blockAuthor()}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-300 hover:bg-white/5"
              >
                <Ban className="w-3 h-3" /> Block @{post.author.handle}
              </button>
            )}
          </div>
        </>
      )}

      {/* Report modal */}
      {reportOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button aria-label="Close" onClick={() => setReportOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <div className="relative w-full max-w-sm p-5 rounded-2xl bg-black border border-white/15 shadow-2xl">
            <h2 className="text-base font-semibold text-white mb-3">Report post</h2>
            {reportSent ? (
              <p className="text-sm text-white/80">Thanks — we&apos;ll review.</p>
            ) : (
              <>
                <div className="space-y-1.5 mb-3">
                  {REPORT_REASONS.map(r => (
                    <label key={r.value} className="flex items-center gap-2 text-sm text-white/85 cursor-pointer">
                      <input
                        type="radio"
                        name={`reason-${post.id}`}
                        value={r.value}
                        checked={reportReason === r.value}
                        onChange={() => setReportReason(r.value)}
                        className="accent-white"
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
                <textarea
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="Optional context"
                  className="w-full bg-white/[0.05] border border-white/15 rounded-lg px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 resize-none"
                />
                <div className="flex justify-end gap-2 mt-3">
                  <button onClick={() => setReportOpen(false)} className="px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-xs text-white/80">
                    Cancel
                  </button>
                  <button onClick={() => void submitReport()} className="px-4 py-1.5 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/95">
                    Submit
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      </div>{/* end content z-stack above the aura */}
    </article>
  )
}
