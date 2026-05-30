'use client'

/* ============================================================================
   ShareSheet — universal "share to Community" modal.

   Any surface (daily quote, wisdom card, saved item, dream interpretation,
   lesson card on someone else's post) can call useShareSheet().open(payload)
   to pop the same modal we use on /community. One open() call, one consistent
   UX, one place to update if the share flow changes.

   Payload kinds:
     reflection — user's own thought (anon defaults OFF, voice toggle visible)
     quote      — sharing someone else's words (anon defaults ON, attribution
                  shown in the body as "{quote}" — {author}, voice hidden)
     dream      — dream + interpretation share (anon defaults ON, voice hidden)

   Usage:
     const share = useShareSheet()
     share.open({
       kind: 'quote',
       body: 'Quote text...',
       attribution: 'Marcus Aurelius',
       mindsetId: 'stoic',
     })

   Mount <ShareSheetProvider> once at the layout level so every page has access.
   ============================================================================ */

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Loader2, Send, EyeOff, Mic, X, Quote as QuoteIcon, Sparkles } from 'lucide-react'
import { VoiceRecorder } from './VoiceRecorder'
import { useGuidelinesGate } from './GuidelinesGate'
import { InkSpiral } from './InkSpiral'

type ShareKind = 'reflection' | 'quote' | 'dream'

interface SharePayload {
  kind: ShareKind
  /** Body / quote text to seed the composer with. User can edit. */
  body: string
  /** For kind=quote — author of the quote. Will be appended as "— Author". */
  attribution?: string
  /** For reflection — surfaces the "Shared journal entry" badge on the post. */
  sourceEntryId?: string | null
  /** Optional mindset tag (e.g. stoic) that contextualizes the share. */
  mindsetId?: string | null
}

interface ShareSheetCtx {
  open: (p: SharePayload) => void
}

const Ctx = createContext<ShareSheetCtx | null>(null)

const MOODS = [
  { id: 'anxious',     label: 'Anxious',     emoji: '😟' },
  { id: 'overwhelmed', label: 'Overwhelmed', emoji: '😵‍💫' },
  { id: 'stuck',       label: 'Stuck',       emoji: '🌀' },
  { id: 'hopeful',     label: 'Hopeful',     emoji: '🌱' },
  { id: 'grateful',    label: 'Grateful',    emoji: '🙏' },
  { id: 'lost',        label: 'Lost',        emoji: '🧭' },
]

function buildInitialBody(p: SharePayload): string {
  if (p.kind === 'quote') {
    // Format: "quote text" — Attribution
    const q = p.body.trim().replace(/^["“]?|["”]?$/g, '')
    return p.attribution ? `“${q}” — ${p.attribution}` : `“${q}”`
  }
  return p.body
}

interface MeProfile {
  handle: string
  display_name: string
  spiral_name?: string | null
  entry_count?: number
}

export function ShareSheetProvider({ children }: { children: React.ReactNode }) {
  const [payload, setPayload] = useState<SharePayload | null>(null)
  const [draft, setDraft] = useState('')
  const [anon, setAnon] = useState(false)
  const [mood, setMood] = useState<string | null>(null)
  const [voiceMode, setVoiceMode] = useState(false)
  const [voicePayload, setVoicePayload] = useState<{ audio_url: string; duration_sec: number } | null>(null)
  const [posting, setPosting] = useState(false)
  const [posted, setPosted] = useState(false)

  // Caller's own profile — fetched once on first share so the modal
  // shows a "posting as" preview with their actual InkSpiral + handle
  // + spiral name. Cached for the session; refreshed when they re-record
  // their voice or rename their spiral elsewhere (best-effort).
  const [me, setMe] = useState<MeProfile | null>(null)

  const ensureMe = useCallback(async () => {
    if (me) return
    try {
      // Pull both the profile (handle + display_name + spiral_name) and
      // the wall stats (entry_count) using the public per-handle endpoint
      // so we get exactly the same shape that bylines elsewhere render.
      const meRes = await fetch('/api/social/profile/me')
      if (!meRes.ok) return
      const meData = await meRes.json()
      const baseHandle = meData?.profile?.handle
      if (!baseHandle) return
      const fullRes = await fetch(`/api/social/profile/${baseHandle}`)
      if (!fullRes.ok) {
        setMe({ handle: baseHandle, display_name: meData.profile.display_name || baseHandle })
        return
      }
      const fullData = await fullRes.json()
      setMe({
        handle: fullData.profile.handle,
        display_name: fullData.profile.display_name,
        spiral_name: fullData.profile.spiral_name ?? null,
        entry_count: fullData.stats?.entry_count ?? 0,
      })
    } catch (err) {
      console.debug('[ShareSheet] me lookup skipped:', err)
    }
  }, [me])

  const guidelinesGate = useGuidelinesGate()

  const open = useCallback((p: SharePayload) => {
    setPayload(p)
    setDraft(buildInitialBody(p))
    // Quotes + dreams default to anon (sharing someone else's words / a vulnerable
    // dream); reflections default to non-anon so users can build a presence.
    setAnon(p.kind === 'quote' || p.kind === 'dream')
    setMood(null)
    setVoiceMode(false)
    setVoicePayload(null)
    setPosting(false)
    setPosted(false)
    // Kick off the "posting as" preview lookup if we haven't yet.
    void ensureMe()
  }, [ensureMe])

  const close = useCallback(() => {
    setPayload(null)
  }, [])

  const submit = useCallback(async () => {
    if (!payload) return
    const text = draft.trim()
    if (!text || posting) return
    await guidelinesGate.run(async () => {
      setPosting(true)
      try {
        const res = await fetch('/api/social/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            body: text,
            anonymous: anon,
            mood: mood || undefined,
            mindsetId: payload.mindsetId || undefined,
            sourceEntryId: payload.sourceEntryId || undefined,
            voiceUrl: voicePayload?.audio_url,
            voiceDurationSec: voicePayload?.duration_sec,
          }),
        })
        if (!res.ok) throw new Error('share failed')
        setPosted(true)
        // Auto-dismiss after the receipt has a beat to register.
        setTimeout(() => { close() }, 1200)
      } catch (err) {
        console.error('[ShareSheet] share failed:', err)
      } finally {
        setPosting(false)
      }
    })
  }, [payload, draft, anon, mood, voicePayload, posting, guidelinesGate, close])

  const ctx = useMemo<ShareSheetCtx>(() => ({ open }), [open])

  const showVoice = payload?.kind === 'reflection'
  const headline = payload?.kind === 'quote'
    ? 'Share this quote'
    : payload?.kind === 'dream'
      ? 'Share this dream'
      : 'Share a reflection'
  const headIcon = payload?.kind === 'quote' ? <QuoteIcon className="w-4 h-4 text-white/65" /> : <Sparkles className="w-4 h-4 text-white/65" />

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {payload && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[55] flex items-end lg:items-center justify-center">
          <button
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 bg-black/95 backdrop-blur-xl"
          />
          <div className="relative w-full lg:max-w-xl bg-black border-t lg:border lg:rounded-2xl border-white/15 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-black border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                {headIcon}
                <h2 className="text-base font-semibold text-white">{headline}</h2>
              </div>
              <button
                onClick={close}
                aria-label="Close"
                className="p-1.5 rounded-full hover:bg-white/10 text-white/65"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4">
              {posted ? (
                <div className="py-8 text-center">
                  <p className="text-base text-white/90">Shared to Community ✨</p>
                </div>
              ) : (
                <>
                  {/* "Posting as" preview — shows the caller's actual
                      InkSpiral + display name + spiral name so they see
                      what their byline will look like before they share.
                      Flips to an Anonymous chip when the Anonymous toggle
                      is on. Suppressed if profile lookup hasn't returned
                      yet (skeleton would just be noise on a fast network). */}
                  {me && (
                    <div className="mb-3 flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      {anon ? (
                        <>
                          <div className="w-8 h-8 rounded-full bg-white/10 grid place-items-center shrink-0">
                            <EyeOff className="w-3.5 h-3.5 text-white/55" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[12px] text-white/65 leading-tight">Posting as <span className="text-white/85 font-medium">Anonymous</span></div>
                            <div className="text-[10.5px] text-white/40 leading-tight">Your name + spiral won&apos;t be shown</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded-full bg-white/[0.04] grid place-items-center shrink-0">
                            <InkSpiral
                              seed={me.handle}
                              entryCount={me.entry_count ?? 0}
                              size={28}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[12px] text-white/65 leading-tight">
                              Posting as <span className="text-white/90 font-medium">{me.display_name}</span>
                              <span className="text-white/40"> · @{me.handle}</span>
                            </div>
                            {me.spiral_name && (
                              <div className="text-[10.5px] text-white/45 leading-tight italic">{me.spiral_name}</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {showVoice && voiceMode && (
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

                  {payload.kind === 'quote' && (
                    <p className="text-[11px] text-white/45 mb-2">
                      Sharing as anonymous by default — you&apos;re amplifying someone else&apos;s words.
                    </p>
                  )}

                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={
                      payload.kind === 'quote'
                        ? 'Quote — edit if you want'
                        : payload.kind === 'dream'
                          ? 'Your dream — edit before sharing'
                          : "What's been on your mind? (tap to write)"
                    }
                    rows={6}
                    maxLength={1200}
                    /* No autoFocus — wait for the user to tap the field
                       before opening the keyboard, FB/Threads style. */
                    className="w-full bg-transparent text-[16px] text-white placeholder-white/40 caret-white focus:outline-none resize-none"
                  />

                  {/* Mood selector */}
                  <div className="mt-3 flex items-center flex-wrap gap-1.5">
                    {MOODS.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setMood(mood === m.id ? null : m.id)}
                        className={`inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-[11px] transition-colors ${
                          mood === m.id ? 'bg-white text-black' : 'bg-white/[0.05] text-white/65 hover:text-white'
                        }`}
                      >
                        <span>{m.emoji}</span>{m.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Button-style toggle (not a <input> checkbox) so iOS
                          doesn't count it as another form field and grey
                          out the keyboard accessory bar's up/down arrows. */}
                      <button
                        type="button"
                        onClick={() => setAnon(a => !a)}
                        aria-pressed={anon}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors ${
                          anon
                            ? 'bg-white text-black'
                            : 'bg-white/[0.06] text-white/75 hover:text-white hover:bg-white/[0.10]'
                        }`}
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        Anonymous
                      </button>
                      {showVoice && !voiceMode && !voicePayload && (
                        <button
                          onClick={() => setVoiceMode(true)}
                          aria-label="Record voice reflection"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-xs text-white/80 transition-colors"
                        >
                          <Mic className="w-3 h-3" />
                          Voice
                        </button>
                      )}
                      {showVoice && voicePayload && (
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
                        disabled={!draft.trim() || posting}
                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-white text-black text-sm font-semibold disabled:opacity-40 hover:bg-white/90 transition-colors press-scale"
                      >
                        {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Share
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <guidelinesGate.Modal />
    </Ctx.Provider>
  )
}

export function useShareSheet(): ShareSheetCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useShareSheet must be used inside <ShareSheetProvider>')
  return c
}
