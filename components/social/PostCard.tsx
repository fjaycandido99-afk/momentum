'use client'

/* ============================================================================
   PostCard — Twitter/Threads-style row.

   FEED variant (default):
     A flat row with the avatar in a fixed-width left column, content in
     a flex-1 right column, and a thin divider underneath. Body is the
     focus. Mood + mindset live inline in the byline. Voice + reply-
     parent stay because they ARE the content. The AI extras (essence
     pulled-quote, lesson card, echo quote, themes chips) DON'T render
     in the feed — they only surface on /post/:id detail to keep the
     scroll feeling like a feed, not a magazine.

   DETAIL variant:
     Same row, but the AI extras render under the body. Used by
     PostDetailClient on /post/:id.

   We dropped the per-card rounded background, the per-mindset glow
   gradient, and the breathing aura — the wall-of-cards feel was the
   visual problem the user flagged. Mindset still shows as a small
   inline link in the byline, and the avatar still wears a subtle
   per-mindset ring, so each post has identity without each post
   shouting it.
   ============================================================================ */

import Link from 'next/link'
import { useEffect, useRef, useState, useCallback } from 'react'
import { EyeOff, Heart, MessageCircle, MoreHorizontal, Flag, Loader2, Send, AlertTriangle, Bookmark, BookmarkCheck, Quote, CornerUpLeft, Ban, Play, Pause, Mic, PenLine } from 'lucide-react'
import { crisisResourceForLevel, type CrisisRegion } from '@/lib/social/crisis-detect'
import { getMindsetStyle } from '@/lib/social/mindset-style'

interface Author { handle: string; display_name: string }
interface ReplyParent { id: string; excerpt: string; author: Author | null }
interface PostShape {
  id: string
  body: string
  essence?: string | null
  themes?: string[]
  echo_quote?: string | null
  echo_attribution?: string | null
  lesson_title?: string | null
  lesson_body?: string | null
  voice_url?: string | null
  voice_duration_sec?: number | null
  mindset_id: string | null
  anonymous: boolean
  created_at: string
  reaction_count: number
  comment_count: number
  crisis_level?: string | null
  source_entry_id?: string | null
  mood?: string | null
  view_count?: number
  relate_count?: number
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

// 3-reaction system kept (heart / relate / learn) but rendered as a tight
// inline cluster in the action row, not as big pill buttons.
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
  if (min < 1) return 'now'
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d`
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface Props {
  post: PostShape
  crisisRegion?: CrisisRegion
  /**
   * 'feed'   → strip AI extras (essence pull-quote, lesson, echo, themes)
   *            so the row reads like a Twitter/Threads post.
   * 'detail' → render the full enriched view; used by /post/:id.
   * Default: 'feed'.
   */
  variant?: 'feed' | 'detail'
}

export function PostCard({ post: initial, crisisRegion = 'US', variant = 'feed' }: Props) {
  const [post, setPost] = useState<PostShape>(initial)

  const [commentsOpen, setCommentsOpen] = useState(false)
  const [comments, setComments] = useState<CommentShape[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [commentPosting, setCommentPosting] = useState(false)
  const [commentError, setCommentError] = useState('')

  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [reportReason, setReportReason] = useState('abuse')
  const [reportNotes, setReportNotes] = useState('')
  const [reportSent, setReportSent] = useState(false)

  const [suggestions, setSuggestions] = useState<string[]>([])
  const suggestionsLoadedRef = useRef(false)

  // Audio player state — only used when post.voice_url is set.
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const toggleVoice = () => {
    if (!post.voice_url) return
    if (!audioRef.current) {
      const audio = new Audio(post.voice_url)
      audio.preload = 'metadata'
      audio.onplay = () => setAudioPlaying(true)
      audio.onpause = () => setAudioPlaying(false)
      audio.onended = () => { setAudioPlaying(false); setAudioProgress(0) }
      audio.ontimeupdate = () => {
        if (audio.duration > 0) setAudioProgress(audio.currentTime / audio.duration)
      }
      audioRef.current = audio
    }
    if (audioRef.current.paused) audioRef.current.play().catch(() => {})
    else audioRef.current.pause()
  }
  useEffect(() => () => { audioRef.current?.pause() }, [])

  const [bookmarked, setBookmarked] = useState(false)
  const [bookmarkBusy, setBookmarkBusy] = useState(false)

  const [replyOpen, setReplyOpen] = useState(false)
  const [replyDraft, setReplyDraft] = useState('')
  const [replyAnon, setReplyAnon] = useState(false)
  const [replyPosting, setReplyPosting] = useState(false)
  const [replySent, setReplySent] = useState(false)

  // View tracking — fires once per (post, session).
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
  const mindsetStyle = getMindsetStyle(post.mindset_id)
  const commentsLocked = post.crisis_level === 'urgent'
  const isDetail = variant === 'detail'

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
    } catch { /* silent */ }
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
    setHidden(true)
    try {
      await fetch('/api/social/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: post.author.handle }),
      })
    } catch {
      setHidden(false)
    }
  }

  if (hidden) return null

  // JSX comment trap mitigation: keep this comment OUTSIDE the return.
  // Article wrapper is a flat row — no rounded bg, no border card, just
  // a hairline divider under the row, and a subtle hover wash so the
  // whole thing reads like a Twitter/Threads timeline.
  return (
    <article className="relative px-4 py-3.5 border-b border-white/[0.06] hover:bg-white/[0.015] transition-colors">
      <div className="flex gap-3">
        {/* AVATAR COLUMN */}
        <div className="shrink-0">
          {post.author ? (
            <Link
              href={`/user/${post.author.handle}`}
              className={`block w-10 h-10 rounded-full bg-white/10 grid place-items-center text-[13px] font-semibold text-white/85 hover:bg-white/15 transition-colors ring-1 ${mindsetStyle.avatarRing}`}
            >
              {post.author.display_name.charAt(0).toUpperCase()}
            </Link>
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/10 grid place-items-center">
              <EyeOff className="w-4 h-4 text-white/60" />
            </div>
          )}
        </div>

        {/* CONTENT COLUMN */}
        <div className="flex-1 min-w-0">
          {/* BYLINE — name · @handle · time · mood · mindset, all on one
              wrapping line like Threads. ⋯ menu pulled to the right. */}
          <div className="flex items-start gap-1 text-[13.5px] leading-tight">
            <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              {post.author ? (
                <>
                  <Link
                    href={`/user/${post.author.handle}`}
                    className="font-semibold text-white hover:underline truncate max-w-[180px]"
                  >
                    {post.author.display_name}
                  </Link>
                  <Link
                    href={`/user/${post.author.handle}`}
                    className="text-white/45 hover:text-white/65 transition-colors truncate"
                  >
                    @{post.author.handle}
                  </Link>
                </>
              ) : (
                <span className="font-semibold text-white/70">Anonymous</span>
              )}
              <span className="text-white/40">·</span>
              <Link
                href={`/post/${post.id}`}
                className="text-white/45 hover:underline tabular-nums"
                title={new Date(post.created_at).toLocaleString()}
              >
                {formatRelative(post.created_at)}
              </Link>
              {post.is_own && <span className="text-[10.5px] text-white/40">(you)</span>}
              {post.mood && (
                <>
                  <span className="text-white/30">·</span>
                  <span className="text-[12px] text-white/50 capitalize">{post.mood}</span>
                </>
              )}
              {post.mindset_id && (
                <>
                  <span className="text-white/30">·</span>
                  <Link
                    href={`/community/${post.mindset_id}`}
                    className="text-[12px] text-white/55 hover:text-white/85 transition-colors lowercase"
                  >
                    {post.mindset_id}
                  </Link>
                </>
              )}
            </div>
            {!post.is_own && (
              <button
                onClick={() => setMenuOpen(o => !o)}
                aria-label="More"
                className="p-1 -mt-1 -mr-1 rounded-full hover:bg-white/10 transition-colors text-white/45 hover:text-white"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* CRISIS BANNER — sits right under the byline, full width of
              the content column. */}
          {crisisResource && (
            <div className="mt-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-400/25">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-amber-200/90">{crisisResource.headline}</span>
              </div>
              <p className="text-[12.5px] text-white/85 leading-relaxed mb-1.5">{crisisResource.body}</p>
              <ul className="space-y-0.5">
                {crisisResource.resources.map(r => (
                  <li key={r.label}>
                    <a
                      href={r.href}
                      target={r.href.startsWith('http') ? '_blank' : undefined}
                      rel="noopener noreferrer"
                      className="text-[11.5px] text-amber-200 hover:text-white underline underline-offset-2"
                    >
                      {r.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* REPLY-PARENT — compact quoted block when this post is a reply. */}
          {post.reply_to && (
            <Link
              href={`/post/${post.reply_to.id}`}
              className="mt-1.5 mb-0.5 block p-2 rounded-lg bg-white/[0.025] border border-white/[0.06] hover:bg-white/[0.05] transition-colors"
            >
              <div className="flex items-center gap-1 text-[10.5px] text-white/45 mb-0.5">
                <Quote className="w-3 h-3" />
                <span>Replying to {post.reply_to.author ? `@${post.reply_to.author.handle}` : 'Anonymous'}</span>
              </div>
              <p className="text-[12px] text-white/65 leading-snug line-clamp-2 italic">&ldquo;{post.reply_to.excerpt}&rdquo;</p>
            </Link>
          )}

          {/* VOICE PLAYER — voice IS the content; keeps prominence in feed. */}
          {post.voice_url && (
            <div className="mt-2 p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-3">
              <button
                onClick={toggleVoice}
                aria-label={audioPlaying ? 'Pause voice reflection' : 'Play voice reflection'}
                className="w-9 h-9 rounded-full bg-white text-black grid place-items-center shrink-0 hover:bg-white/95 press-scale"
              >
                {audioPlaying ? <Pause className="w-3.5 h-3.5" fill="black" /> : <Play className="w-3.5 h-3.5 ml-0.5" fill="black" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-white/55 mb-1">
                  <Mic className="w-3 h-3" />
                  <span>Voice</span>
                  {post.voice_duration_sec ? (
                    <span className="text-white/40 normal-case tracking-normal">
                      · {Math.floor(post.voice_duration_sec / 60)}:{String(post.voice_duration_sec % 60).padStart(2, '0')}
                    </span>
                  ) : null}
                </div>
                <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full bg-white/70 transition-all duration-200"
                    style={{ width: `${Math.round(audioProgress * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* BODY — the post itself. Wrapped in a Link so the whole body
              row navigates to /post/:id like Twitter does (action buttons
              below stopPropagation by being separate siblings). */}
          {post.body && (
            <Link href={`/post/${post.id}`} className="block">
              <p className="mt-1.5 text-[14.5px] text-white/90 leading-relaxed whitespace-pre-wrap break-words">
                {post.body}
              </p>
            </Link>
          )}

          {/* DETAIL-ONLY: AI essence pulled-quote, lesson card, echo. These
              add up to a magazine feel in the feed; on /post/:id they're
              the whole point of the visit. */}
          {isDetail && post.essence && (
            <p className="mt-3 text-[17px] lg:text-[19px] leading-snug text-white font-medium italic">
              &ldquo;{post.essence.trim()}&rdquo;
            </p>
          )}
          {isDetail && post.lesson_title && post.lesson_body && (
            <div
              className="mt-3 p-3.5 rounded-xl border border-white/[0.12] overflow-hidden"
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
          {isDetail && post.echo_quote && post.echo_attribution && (
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

          {/* ACTION ROW — flat icons + counts, Twitter style. Comment on
              the left, then the 3 reaction kinds, then reply + bookmark
              on the right. */}
          <div className="mt-2.5 -ml-1.5 flex items-center gap-1 max-w-md">
            <button
              onClick={toggleComments}
              aria-label="Comments"
              className="group inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-white/50 hover:text-sky-300 hover:bg-sky-400/10 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs tabular-nums">{post.comment_count || ''}</span>
            </button>

            {!post.is_own && (
              <button
                onClick={() => setReplyOpen(o => !o)}
                aria-label="Reply with your reflection"
                title="Reply with your own reflection"
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-white/50 hover:text-emerald-300 hover:bg-emerald-400/10 transition-colors"
              >
                <CornerUpLeft className="w-4 h-4" />
              </button>
            )}

            {/* Reflect-on-this — takes the reader to the journal with this
                post pre-loaded as a seed prompt. The community-to-journal
                direction; lets a post that resonates become a private write. */}
            {!post.is_own && (
              <Link
                href={`/journal?seed=${post.id}`}
                aria-label="Reflect on this in your journal"
                title="Reflect on this in your journal"
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-white/50 hover:text-amber-300 hover:bg-amber-400/10 transition-colors"
              >
                <PenLine className="w-4 h-4" />
              </Link>
            )}

            {/* Reaction cluster — 3 emoji buttons + total count. */}
            <div className="inline-flex items-center">
              {REACTION_KINDS.map(r => {
                const active = post.my_reactions.includes(r.kind)
                return (
                  <button
                    key={r.kind}
                    onClick={() => void react(r.kind)}
                    aria-label={r.label}
                    title={r.label}
                    className={`px-1.5 py-1 rounded-full text-sm transition-all press-scale ${
                      active ? 'scale-110' : 'grayscale opacity-55 hover:opacity-100 hover:grayscale-0'
                    }`}
                  >
                    {r.emoji}
                  </button>
                )
              })}
              {post.reaction_count > 0 && (
                <span className="ml-1 text-xs text-white/50 tabular-nums">{post.reaction_count}</span>
              )}
            </div>

            <div className="ml-auto inline-flex items-center">
              {!post.is_own && (
                <button
                  onClick={() => void saveReflection()}
                  disabled={bookmarked || bookmarkBusy}
                  aria-label={bookmarked ? 'Saved' : 'Save reflection'}
                  title={bookmarked ? 'Saved to your library' : 'Save to my library'}
                  className={`inline-flex items-center px-2 py-1 rounded-full transition-colors ${
                    bookmarked ? 'text-white' : 'text-white/50 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  {bookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {/* OWN-POST FOOTER COUNTS — only the author sees their view/relate counts. */}
          {post.is_own && ((post.view_count ?? 0) > 0 || (post.relate_count ?? 0) > 0) && (
            <div className="mt-1.5 flex items-center gap-3 text-[11px] text-white/40">
              {(post.view_count ?? 0) > 0 && <span>{post.view_count} read</span>}
              {(post.relate_count ?? 0) > 0 && <span>🪞 {post.relate_count} related</span>}
            </div>
          )}

          {/* REPLY COMPOSER — inline, like Threads' inline reply. */}
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

          {/* COMMENTS THREAD — opens inline on tap. */}
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
                    className="w-7 h-7 rounded-full bg-white/10 grid place-items-center text-[11px] font-semibold text-white/80 shrink-0"
                  >
                    {c.author.display_name.charAt(0).toUpperCase()}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-white/55 mb-0.5">
                      <Link href={`/user/${c.author.handle}`} className="text-white/85 hover:underline font-medium">{c.author.display_name}</Link>
                      <span className="ml-1.5">{formatRelative(c.created_at)}</span>
                    </div>
                    <p className="text-[13.5px] text-white/90 leading-relaxed whitespace-pre-wrap">{c.body}</p>
                  </div>
                </div>
              ))}
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
              {!commentsLocked && (
                <div className="flex items-end gap-2 pt-1">
                  <textarea
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    rows={1}
                    maxLength={600}
                    placeholder="Reply with care…"
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
        </div>
      </div>

      {/* ACTION MENU — anchored to the ⋯ button in the byline. */}
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

      {/* REPORT MODAL */}
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
    </article>
  )
}
