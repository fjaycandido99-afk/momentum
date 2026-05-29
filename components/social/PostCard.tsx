'use client'

/* ============================================================================
   PostCard — single post with reactions, comments, report, crisis banner.
   Phase 3 additions: inline comment thread, report-flow menu, crisis-
   resource banner on crisis_level posts.
   ============================================================================ */

import Link from 'next/link'
import { useState, useCallback } from 'react'
import { EyeOff, Heart, MessageCircle, MoreHorizontal, Flag, Loader2, Send, AlertTriangle } from 'lucide-react'
import { crisisResourceForLevel } from '@/lib/social/crisis-detect'

interface Author { handle: string; display_name: string }
interface PostShape {
  id: string
  body: string
  mindset_id: string | null
  anonymous: boolean
  created_at: string
  reaction_count: number
  comment_count: number
  crisis_level?: string | null
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

const REACTION_KINDS: { kind: 'heart' | 'felt' | 'strength'; emoji: string; label: string }[] = [
  { kind: 'heart',    emoji: '❤️', label: 'Heart' },
  { kind: 'felt',     emoji: '🫶', label: 'Felt this' },
  { kind: 'strength', emoji: '💪', label: 'Strength' },
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

export function PostCard({ post: initial }: { post: PostShape }) {
  const [post, setPost] = useState<PostShape>(initial)

  const [commentsOpen, setCommentsOpen] = useState(false)
  const [comments, setComments] = useState<CommentShape[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [commentPosting, setCommentPosting] = useState(false)
  const [commentError, setCommentError] = useState('')

  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('abuse')
  const [reportNotes, setReportNotes] = useState('')
  const [reportSent, setReportSent] = useState(false)

  const crisisResource = crisisResourceForLevel((post.crisis_level as 'urgent' | 'concern' | null) || null)
  const commentsLocked = post.crisis_level === 'urgent'

  const react = async (kind: 'heart' | 'felt' | 'strength') => {
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

  const toggleComments = () => {
    setCommentsOpen(o => {
      const next = !o
      if (next && comments.length === 0) void loadComments()
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

  return (
    <article className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] relative">
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

      {/* Body */}
      <p className="text-[15px] text-white/90 leading-relaxed whitespace-pre-wrap">{post.body}</p>

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
      </div>

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
          <div className="absolute top-10 right-3 z-50 min-w-[160px] py-1 rounded-xl bg-black border border-white/15 shadow-xl">
            <button
              onClick={() => { setMenuOpen(false); setReportOpen(true) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/85 hover:bg-white/5"
            >
              <Flag className="w-3 h-3" /> Report
            </button>
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
    </article>
  )
}
