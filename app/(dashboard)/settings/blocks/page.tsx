'use client'

/* ============================================================================
   /settings/blocks — manage blocked users.
   Lists everyone the user has blocked. Tap Unblock to lift the block.
   ============================================================================ */

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, Loader2, Ban } from 'lucide-react'

interface BlockedUser {
  id: string
  user_id: string
  created_at: string
  profile: { handle: string; display_name: string }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function BlocksPage() {
  const [blocks, setBlocks] = useState<BlockedUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/social/block')
      if (res.ok) {
        const data = await res.json()
        setBlocks(data.blocks || [])
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const unblock = async (b: BlockedUser) => {
    setBusyId(b.id)
    try {
      await fetch('/api/social/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: b.profile.handle }),
      })
      setBlocks(rs => rs.filter(r => r.id !== b.id))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen text-white pb-24">
      <div className="px-6 pt-12 pb-3">
        <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white">
          <ChevronLeft className="w-4 h-4" /> Settings
        </Link>
        <h1 className="text-2xl font-bold mt-2">Blocked users</h1>
        <p className="text-xs text-white/55 mt-1">You won&apos;t see their posts and they won&apos;t see yours.</p>
      </div>

      <div className="px-6 pt-2">
        {isLoading && (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-white/60 animate-spin" /></div>
        )}
        {!isLoading && blocks.length === 0 && (
          <div className="text-center py-16">
            <Ban className="w-8 h-8 text-white/30 mx-auto mb-3" />
            <p className="text-sm text-white/70">You haven&apos;t blocked anyone.</p>
          </div>
        )}
        <ul className="space-y-2">
          {blocks.map(b => (
            <li key={b.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              <div className="w-9 h-9 rounded-full bg-white/10 grid place-items-center text-sm font-semibold text-white/80">
                {b.profile.display_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white truncate">{b.profile.display_name}</div>
                <div className="text-[11px] text-white/50">@{b.profile.handle} · blocked {formatDate(b.created_at)}</div>
              </div>
              <button
                onClick={() => void unblock(b)}
                disabled={busyId === b.id}
                className="px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-xs text-white disabled:opacity-50"
              >
                {busyId === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Unblock'}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
