'use client'

/* ============================================================================
   /user/[handle] — public profile page.
   Shows: display name, handle, bio, mindset persona, follower/following
   counts, follow button, and the user's latest posts.
   On the owner's own profile, the follow button is replaced with an
   "Edit profile" inline editor.
   ============================================================================ */

import { useEffect, useState, useCallback, use } from 'react'
import Link from 'next/link'
import { ChevronLeft, Loader2, UserCheck, UserPlus, Pencil, Check, X, Ban, MoreHorizontal } from 'lucide-react'
import { PostCard } from '@/components/social/PostCard'

interface ProfileData {
  user_id: string
  handle: string
  display_name: string
  bio: string | null
  mindset_id: string | null
  is_own: boolean
  /// Either party has blocked the other — UI shows a gated state.
  blocked?: boolean
  /// 'by_me' = I blocked them (offer Unblock); 'by_them' = they blocked me.
  block_direction?: 'by_me' | 'by_them' | null
}
interface Stats { followers: number; following: number; is_followed_by_me: boolean }
interface Author { handle: string; display_name: string }
interface ProfilePost {
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

export default function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = use(params)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [stats, setStats] = useState<Stats>({ followers: 0, following: 0, is_followed_by_me: false })
  const [posts, setPosts] = useState<ProfilePost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  // Block action (and Unblock when block_direction === 'by_me')
  const [menuOpen, setMenuOpen] = useState(false)
  const toggleBlock = async () => {
    if (!profile || profile.is_own) return
    const isBlockingThem = profile.block_direction === 'by_me'
    if (!isBlockingThem && !confirm(`Block @${profile.handle}? You won't see their posts and they won't see yours.`)) return
    setMenuOpen(false)
    try {
      await fetch('/api/social/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: profile.handle }),
      })
      await load()
    } catch {}
  }

  // Edit state (own profile only)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editHandle, setEditHandle] = useState('')
  const [editError, setEditError] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/social/profile/${handle}`)
      if (res.status === 404) { setNotFound(true); return }
      if (!res.ok) throw new Error('load failed')
      const data = await res.json()
      setProfile(data.profile)
      setStats(data.stats)
      setPosts(data.posts || [])
    } catch (err) {
      console.error('[profile] load failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [handle])

  useEffect(() => { void load() }, [load])

  const toggleFollow = async () => {
    if (!profile || profile.is_own || followLoading) return
    setFollowLoading(true)
    // Optimistic
    setStats(s => ({
      ...s,
      is_followed_by_me: !s.is_followed_by_me,
      followers: s.is_followed_by_me ? Math.max(0, s.followers - 1) : s.followers + 1,
    }))
    try {
      const res = await fetch('/api/social/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: profile.handle }),
      })
      if (res.ok) {
        const data = await res.json()
        setStats(s => ({ ...s, is_followed_by_me: data.active, followers: data.followers }))
      } else {
        // Revert
        setStats(s => ({
          ...s,
          is_followed_by_me: !s.is_followed_by_me,
          followers: s.is_followed_by_me ? s.followers + 1 : Math.max(0, s.followers - 1),
        }))
      }
    } finally {
      setFollowLoading(false)
    }
  }

  const openEdit = () => {
    if (!profile) return
    setEditName(profile.display_name)
    setEditBio(profile.bio || '')
    setEditHandle(profile.handle)
    setEditError('')
    setEditing(true)
  }

  const saveEdit = async () => {
    setEditSaving(true); setEditError('')
    try {
      const res = await fetch('/api/social/profile/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: editName, bio: editBio, handle: editHandle }),
      })
      if (!res.ok) {
        const data = await res.json()
        setEditError(data.error || 'Save failed')
        return
      }
      setEditing(false)
      // If the handle changed we need to redirect to the new URL.
      const data = await res.json()
      if (data.profile?.handle && data.profile.handle !== handle) {
        window.location.replace(`/user/${data.profile.handle}`)
        return
      }
      await load()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'unknown')
    } finally {
      setEditSaving(false)
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen text-white pb-24 lg:max-w-3xl lg:mx-auto px-6 pt-16 text-center">
        <p className="text-lg">Profile not found</p>
        <Link href="/community" className="inline-block mt-4 text-sm text-white/60 hover:text-white">
          ← Back to community
        </Link>
      </div>
    )
  }
  if (!isLoading && profile?.blocked) {
    const byMe = profile.block_direction === 'by_me'
    return (
      <div className="min-h-screen text-white pb-24 lg:max-w-3xl lg:mx-auto">
        <div className="px-6 pt-12 pb-3">
          <Link href="/community" className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white">
            <ChevronLeft className="w-4 h-4" /> Community
          </Link>
        </div>
        <div className="px-6">
          <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-center">
            <Ban className="w-8 h-8 text-white/40 mx-auto mb-3" />
            <p className="text-sm text-white/80">
              {byMe ? `You blocked @${profile.handle}.` : 'This profile is not available.'}
            </p>
            {byMe && (
              <button
                onClick={() => void toggleBlock()}
                className="mt-4 px-4 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-xs text-white"
              >
                Unblock
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }
  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-white/60 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white pb-24 lg:max-w-3xl lg:mx-auto">
      {/* Header / back */}
      <div className="px-6 pt-12 pb-3">
        <Link href="/community" className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white">
          <ChevronLeft className="w-4 h-4" /> Community
        </Link>
      </div>

      {/* Profile card */}
      <div className="px-6">
        <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
          {!editing ? (
            <>
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-full bg-white/10 grid place-items-center text-lg font-semibold text-white">
                  {profile.display_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold text-white leading-tight">{profile.display_name}</h1>
                  <p className="text-xs text-white/50">@{profile.handle}</p>
                </div>
                {profile.is_own ? (
                  <button onClick={openEdit} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-xs text-white transition-colors">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={toggleFollow}
                      disabled={followLoading}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors press-scale ${
                        stats.is_followed_by_me
                          ? 'bg-white/[0.08] text-white hover:bg-white/[0.14]'
                          : 'bg-white text-black hover:bg-white/95'
                      }`}
                    >
                      {stats.is_followed_by_me ? <><UserCheck className="w-3 h-3" /> Following</> : <><UserPlus className="w-3 h-3" /> Follow</>}
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(o => !o)}
                        aria-label="More"
                        className="p-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12]"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5 text-white/70" />
                      </button>
                      {menuOpen && (
                        <>
                          <button aria-label="Close menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 cursor-default" />
                          <div className="absolute right-0 top-9 z-50 min-w-[180px] py-1 rounded-xl bg-black border border-white/15 shadow-xl">
                            <button
                              onClick={() => void toggleBlock()}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-300 hover:bg-white/5"
                            >
                              <Ban className="w-3 h-3" /> Block @{profile.handle}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {profile.bio && (
                <p className="text-sm text-white/80 leading-relaxed mt-3 whitespace-pre-wrap">{profile.bio}</p>
              )}
              <div className="flex gap-5 mt-4 text-xs">
                <span className="text-white/70"><span className="text-white font-semibold">{stats.followers}</span> followers</span>
                <span className="text-white/70"><span className="text-white font-semibold">{stats.following}</span> following</span>
                {profile.mindset_id && (
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-white/[0.06] text-white/65 text-[10.5px] uppercase tracking-wider">
                    {profile.mindset_id}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-white/55">Display name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={60}
                  className="mt-1 w-full bg-white/[0.05] border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-white/55">Handle</label>
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-white/50">@</span>
                  <input
                    value={editHandle}
                    onChange={(e) => setEditHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    maxLength={24}
                    className="flex-1 bg-white/[0.05] border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-white/55">Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  maxLength={280}
                  rows={3}
                  placeholder="A short line about you (optional)"
                  className="mt-1 w-full bg-white/[0.05] border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 resize-none"
                />
                <div className="text-right text-[10px] text-white/40 mt-0.5">{editBio.length}/280</div>
              </div>
              {editError && <p className="text-xs text-red-300">{editError}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setEditing(false)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-xs text-white/80 transition-colors">
                  <X className="w-3 h-3" /> Cancel
                </button>
                <button onClick={saveEdit} disabled={editSaving} className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-white text-black text-xs font-semibold disabled:opacity-40 hover:bg-white/95 transition-colors">
                  {editSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Posts */}
      <div className="px-6 pt-6 space-y-3">
        {posts.length === 0 && (
          <p className="text-sm text-white/55 text-center py-8">No posts yet.</p>
        )}
        {posts.map(p => <PostCard key={p.id} post={p} />)}
      </div>
    </div>
  )
}
