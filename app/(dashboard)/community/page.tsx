'use client'

/* ============================================================================
   /community — the public feed.
   Phase 4 additions:
   - Mood filter chips ("show me people who felt anxious and got through it")
   - Mindset jump-chips → /community/[mindset]
   - PostCard now carries the journal source / mood / mindset / view counts
   ============================================================================ */

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Loader2, Sparkles, Send, EyeOff, RefreshCw, FileText, Mic, SlidersHorizontal, Pencil, X } from 'lucide-react'
import { PostCard } from '@/components/social/PostCard'
import { CommunityPulse } from '@/components/social/CommunityPulse'
import { VoiceRecorder } from '@/components/social/VoiceRecorder'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'
import type { MindsetId } from '@/lib/mindset/types'
import { useGuidelinesGate } from '@/components/social/GuidelinesGate'

interface Author { handle: string; display_name: string }
interface FeedPost {
  id: string
  body: string
  mindset_id: string | null
  source_entry_id: string | null
  anonymous: boolean
  mood?: string | null
  view_count?: number
  relate_count?: number
  reply_to?: { id: string; excerpt: string; author: Author | null } | null
  created_at: string
  reaction_count: number
  comment_count: number
  crisis_level?: string | null
  is_own: boolean
  author: Author | null
  my_reactions: string[]
}

type Scope = 'all' | 'following'

const MOODS = [
  { id: 'anxious',     label: 'Anxious',     emoji: '😟' },
  { id: 'overwhelmed', label: 'Overwhelmed', emoji: '😵‍💫' },
  { id: 'stuck',       label: 'Stuck',       emoji: '🌀' },
  { id: 'hopeful',     label: 'Hopeful',     emoji: '🌱' },
  { id: 'grateful',    label: 'Grateful',    emoji: '🙏' },
  { id: 'lost',        label: 'Lost',        emoji: '🧭' },
]

export default function CommunityPage() {
  const [scope, setScope] = useState<Scope>('all')
  const [mood, setMood] = useState<string | null>(null)
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [crisisRegion, setCrisisRegion] = useState<'US' | 'UK' | 'CA' | 'AU' | 'NZ' | 'EU' | 'OTHER'>('US')
  const [isLoading, setIsLoading] = useState(true)

  const [draft, setDraft] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [composeMood, setComposeMood] = useState<string | null>(null)
  const [isPosting, setIsPosting] = useState(false)
  // Voice-mode state — set when the user records, attached to the
  // POST alongside body (which holds the transcript).
  const [voiceMode, setVoiceMode] = useState(false)
  const [voicePayload, setVoicePayload] = useState<{ audio_url: string; duration_sec: number } | null>(null)

  // Polished-chrome state: a single Filter popover replaces the mood +
  // mindset chip rows; the composer is hidden until the user taps the
  // floating Share FAB.
  const [filterOpen, setFilterOpen] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)

  const guidelinesGate = useGuidelinesGate()

  const loadFeed = useCallback(async (s: Scope, m: string | null) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ limit: '30', scope: s })
      if (m) params.set('mood', m)
      const res = await fetch(`/api/social/feed?${params.toString()}`)
      if (!res.ok) throw new Error('feed fetch failed')
      const data = await res.json()
      setPosts(data.posts || [])
      if (data.crisis_region) setCrisisRegion(data.crisis_region)
    } catch (err) {
      console.error('[community] feed load failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void loadFeed(scope, mood) }, [loadFeed, scope, mood])

  const submit = async () => {
    const body = draft.trim()
    if (!body || isPosting) return
    // Run through the guidelines gate — opens the acceptance modal if
    // this user hasn't accepted yet, then continues the post afterwards.
    await guidelinesGate.run(async () => {
      setIsPosting(true)
      try {
        const res = await fetch('/api/social/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            body,
            anonymous,
            mood: composeMood || undefined,
            voiceUrl: voicePayload?.audio_url,
            voiceDurationSec: voicePayload?.duration_sec,
          }),
        })
        if (!res.ok) throw new Error('post failed')
        setDraft('')
        setComposeMood(null)
        setVoiceMode(false)
        setVoicePayload(null)
        setComposerOpen(false)
        await loadFeed(scope, mood)
      } catch (err) {
        console.error('[community] post failed:', err)
      } finally {
        setIsPosting(false)
      }
    })
  }

  // The 8 mindsets — used inside the Filter popover.
  const MINDSET_IDS: MindsetId[] = ['stoic', 'existentialist', 'cynic', 'hedonist', 'samurai', 'scholar', 'manifestor', 'hustler']

  // Polished chrome:
  //   - One Filter button replaces both the mood-chip row and the
  //     mindset-chip row. Tapping opens a popover with all filters.
  //   - Composer is hidden by default; a floating Pencil FAB at
  //     bottom-right opens a fullscreen modal composer. Result: the
  //     feed is the first thing on screen.
  const activeMoodMeta = mood ? MOODS.find(m => m.id === mood) : null

  return (
    <div className="min-h-screen text-white pb-32">
      {/* Header — title + tabs + Filter button. Mindset + mood chips
          collapsed into the Filter popover so the feed starts higher. */}
      <div className="sticky top-0 z-20 px-6 pt-12 pb-3 bg-black border-b border-white/[0.05]">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold tracking-tight">Community</h1>
          <div className="flex items-center gap-1">
            <Link
              href="/community/guidelines"
              aria-label="Guidelines"
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white/55 hover:text-white"
              title="Community guidelines"
            >
              <FileText className="w-4 h-4" />
            </Link>
            <button
              onClick={() => void loadFeed(scope, mood)}
              aria-label="Refresh"
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>

        {/* Tabs + filter button — one tight row. */}
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-1 p-0.5 rounded-lg bg-white/[0.06]">
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
          <button
            onClick={() => setFilterOpen(o => !o)}
            aria-label="Filter"
            aria-expanded={filterOpen}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              mood || filterOpen
                ? 'bg-white text-black'
                : 'bg-white/[0.06] text-white/75 hover:text-white hover:bg-white/[0.10]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter</span>
            {activeMoodMeta && (
              <span className="text-[10px] tabular-nums opacity-70">· {activeMoodMeta.label}</span>
            )}
          </button>
        </div>
      </div>

      {/* Filter popover — sits just under the header. Mood filter +
          mindset rooms in one place. Closes when a choice is made. */}
      {filterOpen && (
        <>
          <button
            aria-label="Close filter"
            onClick={() => setFilterOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="relative z-20 mx-6 mt-2 p-3.5 rounded-xl bg-black border border-white/15 shadow-2xl">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/55 font-semibold mb-2">
              Mood
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              <button
                onClick={() => { setMood(null); setFilterOpen(false) }}
                className={`px-3 py-1 rounded-full text-[11.5px] font-medium transition-colors ${
                  mood === null ? 'bg-white text-black' : 'bg-white/[0.06] text-white/70 hover:text-white'
                }`}
              >
                All moods
              </button>
              {MOODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setMood(m.id); setFilterOpen(false) }}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11.5px] font-medium transition-colors ${
                    mood === m.id ? 'bg-white text-black' : 'bg-white/[0.06] text-white/70 hover:text-white'
                  }`}
                >
                  <span>{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>

            <div className="text-[10px] uppercase tracking-[0.2em] text-white/55 font-semibold mb-2">
              Mindset rooms
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MINDSET_IDS.map(id => {
                const c = MINDSET_CONFIGS[id]
                return (
                  <Link
                    key={id}
                    href={`/community/${id}`}
                    onClick={() => setFilterOpen(false)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.04] text-[11.5px] text-white/70 hover:text-white hover:bg-white/[0.10] transition-colors"
                  >
                    <span>{c.icon}</span>
                    {c.name}
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Pulse — monochrome, collapsed by default. */}
      <CommunityPulse />

      {/* Floating composer FAB — bottom-right, opens the modal.
          Hidden when the composer modal is open. Padded above the
          bottom nav on mobile via safe-area + a base bottom offset. */}
      {!composerOpen && (
        <button
          onClick={() => setComposerOpen(true)}
          aria-label="Share a reflection"
          className="fixed z-30 right-5 bottom-[6.5rem] lg:bottom-8 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-white text-black shadow-2xl shadow-black/40 hover:bg-white/95 transition-transform press-scale"
        >
          <Pencil className="w-4 h-4" />
          <span className="text-sm font-semibold pr-0.5">Share</span>
        </button>
      )}

      {/* Composer modal — fullscreen on mobile, centered card on desktop. */}
      {composerOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <button
            aria-label="Close"
            onClick={() => setComposerOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />
          <div className="relative w-full lg:max-w-xl bg-black border-t lg:border lg:rounded-2xl border-white/15 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-black border-b border-white/[0.08]">
              <h2 className="text-base font-semibold text-white">Share a reflection</h2>
              <button
                onClick={() => setComposerOpen(false)}
                aria-label="Close"
                className="p-1.5 rounded-full hover:bg-white/10 text-white/65"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4">
              {voiceMode && (
                <div className="mb-3">
                  <VoiceRecorder
                    maxSeconds={30}
                    onReady={(v) => {
                      setVoicePayload({ audio_url: v.audio_url, duration_sec: v.duration_sec })
                      if (v.transcript && !draft.trim()) setDraft(v.transcript)
                    }}
                    onDiscard={() => { setVoiceMode(false); setVoicePayload(null) }}
                  />
                </div>
              )}

              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={voicePayload ? 'Your voice transcript — edit if you like' : "What's been on your mind?"}
                rows={6}
                maxLength={1200}
                autoFocus
                className="w-full bg-transparent text-[16px] text-white placeholder-white/40 caret-white focus:outline-none resize-none"
              />

              {/* Mood selector for the new post */}
              <div className="mt-3 flex items-center flex-wrap gap-1.5">
                {MOODS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setComposeMood(composeMood === m.id ? null : m.id)}
                    className={`inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-[11px] transition-colors ${
                      composeMood === m.id ? 'bg-white text-black' : 'bg-white/[0.05] text-white/65 hover:text-white'
                    }`}
                  >
                    <span>{m.emoji}</span>{m.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2 text-xs text-white/75 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={anonymous}
                      onChange={(e) => setAnonymous(e.target.checked)}
                      className="accent-white"
                    />
                    <EyeOff className="w-3.5 h-3.5" />
                    Anonymous
                  </label>
                  {!voiceMode && !voicePayload && (
                    <button
                      onClick={() => setVoiceMode(true)}
                      aria-label="Record voice reflection"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-xs text-white/80 transition-colors"
                    >
                      <Mic className="w-3 h-3" />
                      Voice
                    </button>
                  )}
                  {voicePayload && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-white/70">
                      <Mic className="w-3 h-3 text-red-300" />
                      Voice attached
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-auto">
                  <span className="text-[10px] text-white/40 tabular-nums">{draft.length}/1200</span>
                  <button
                    onClick={submit}
                    disabled={!draft.trim() || isPosting}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-white text-black text-sm font-semibold disabled:opacity-40 hover:bg-white/90 transition-colors press-scale"
                  >
                    {isPosting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feed — flat Twitter/Threads-style stack. No outer horizontal
          padding so each post's hairline divider stretches edge-to-edge
          within its column (PostCard provides its own px-4). The top
          border completes the look so the first row has a divider too. */}
      <div className="pt-6 border-t border-white/[0.06]">
        {isLoading && posts.length === 0 && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 text-white/60 animate-spin" />
          </div>
        )}

        {!isLoading && posts.length === 0 && (
          <div className="text-center py-16 px-6">
            <Sparkles className="w-8 h-8 text-white/30 mx-auto mb-3" />
            <p className="text-sm text-white/70">
              {scope === 'following'
                ? 'Follow some people to see their posts here.'
                : mood
                  ? `No posts tagged "${mood}" yet.`
                  : 'No posts yet. Be the first.'}
            </p>
          </div>
        )}

        {posts.map(post => <PostCard key={post.id} post={post} crisisRegion={crisisRegion} />)}
      </div>

      {/* Guidelines acceptance modal — only mounts when triggered. */}
      <guidelinesGate.Modal />
    </div>
  )
}
