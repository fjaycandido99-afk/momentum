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
import { Loader2, Sparkles, Send, EyeOff, RefreshCw, FileText, Mic } from 'lucide-react'
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
        await loadFeed(scope, mood)
      } catch (err) {
        console.error('[community] post failed:', err)
      } finally {
        setIsPosting(false)
      }
    })
  }

  // The 8 mindsets — chip strip pointing at the per-mindset feeds.
  const MINDSET_IDS: MindsetId[] = ['stoic', 'existentialist', 'cynic', 'hedonist', 'samurai', 'scholar', 'manifestor', 'hustler']

  return (
    <div className="min-h-screen text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 px-6 pt-12 pb-3 bg-black">
        <div className="flex items-center justify-between mb-1.5">
          <h1 className="text-2xl font-bold tracking-tight">Community</h1>
          <button
            onClick={() => void loadFeed(scope, mood)}
            aria-label="Refresh"
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <p className="text-xs text-white/55 mb-3">
          Share a reflection. Read others. Send strength.{' '}
          <Link href="/community/guidelines" className="inline-flex items-center gap-1 text-white/70 hover:text-white underline-offset-2 hover:underline ml-1">
            <FileText className="w-3 h-3" /> Guidelines
          </Link>
        </p>

        {/* Scope tabs */}
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

        {/* Mood filter chips — "show me people who felt X" */}
        <div className="mt-3 flex gap-1.5 overflow-x-auto scrollbar-hide -mx-6 px-6 pb-1">
          <button
            onClick={() => setMood(null)}
            className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
              mood === null ? 'bg-white text-black' : 'bg-white/[0.06] text-white/65 hover:text-white'
            }`}
          >
            All moods
          </button>
          {MOODS.map(m => (
            <button
              key={m.id}
              onClick={() => setMood(mood === m.id ? null : m.id)}
              className={`shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                mood === m.id ? 'bg-white text-black' : 'bg-white/[0.06] text-white/65 hover:text-white'
              }`}
            >
              <span>{m.emoji}</span>
              {m.label}
            </button>
          ))}
        </div>

        {/* Mindset jump-chips */}
        <div className="mt-2 flex gap-1.5 overflow-x-auto scrollbar-hide -mx-6 px-6 pb-1">
          {MINDSET_IDS.map(id => {
            const c = MINDSET_CONFIGS[id]
            return (
              <Link
                key={id}
                href={`/community/${id}`}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.04] text-[11px] text-white/55 hover:text-white hover:bg-white/[0.08] transition-colors uppercase tracking-wider"
              >
                <span>{c.icon}</span>
                {c.name}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Live mood pulse — top-of-feed glance at how the community
          feels right now. Hides itself if there are no posts. */}
      <CommunityPulse />

      {/* Composer */}
      <div className="px-6 pt-4">
        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
          {/* Voice recorder — opens above the textarea. On `ready` it
              prefills the body with the Whisper transcript and stores
              the audio_url + duration so the eventual POST attaches
              both. Discarding clears voice state and returns to text. */}
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
            placeholder={voicePayload ? 'Your voice transcript — edit if you like' : "Share what's been on your mind…"}
            rows={3}
            maxLength={1200}
            className="w-full bg-transparent text-[15px] text-white placeholder-white/40 caret-white focus:outline-none resize-none"
          />
          {/* Mood selector for the new post */}
          <div className="mt-2 flex items-center flex-wrap gap-1.5">
            {MOODS.map(m => (
              <button
                key={m.id}
                onClick={() => setComposeMood(composeMood === m.id ? null : m.id)}
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10.5px] transition-colors ${
                  composeMood === m.id ? 'bg-white text-black' : 'bg-white/[0.05] text-white/55 hover:text-white'
                }`}
              >
                <span>{m.emoji}</span>{m.label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
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
