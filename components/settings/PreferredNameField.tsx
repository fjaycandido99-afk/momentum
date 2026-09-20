'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, UserRound } from 'lucide-react'
import { NAME_MAX } from '@/lib/user/display-name'

/**
 * "What should Voxu call you?"
 *
 * The auth provider hands over a full legal name — "Francis Andy Jay
 * Supsupon" — which is not what anyone wants to hear at 6am from a coach.
 * This is the name the coach, the wake-up call and the journal use.
 *
 * Saves on blur or Enter rather than behind a button, and shows what will
 * actually be said, including the fallback when the field is empty.
 */
export function PreferredNameField() {
  const [value, setValue] = useState('')
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [state, setState] = useState<'loading' | 'idle' | 'saving' | 'saved'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/user/profile', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(d => {
        if (cancelled) return
        setValue(d.preferredName ?? '')
        setDisplayName(d.displayName ?? null)
        setState('idle')
      })
      .catch(() => { if (!cancelled) setState('idle') })
    return () => { cancelled = true }
  }, [])

  const save = async () => {
    if (state === 'saving' || state === 'loading') return
    setState('saving')
    setError(null)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredName: value }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error || 'Could not save that name.')
        setState('idle')
        return
      }
      setValue(data.preferredName ?? '')
      setDisplayName(data.displayName ?? null)
      setState('saved')
      setTimeout(() => setState(s => (s === 'saved' ? 'idle' : s)), 2000)
    } catch {
      setError('Could not reach Voxu.')
      setState('idle')
    }
  }

  return (
    <div className="mb-6">
      <label htmlFor="preferred-name" className="flex items-center gap-2 text-sm text-white/80">
        <UserRound className="w-4 h-4 text-white/60" /> What should Voxu call you?
      </label>
      <input
        id="preferred-name"
        value={value}
        maxLength={NAME_MAX}
        disabled={state === 'loading'}
        onChange={e => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void save() } }}
        placeholder={displayName ?? 'Your first name'}
        // 16px keeps iOS from zooming the page on focus.
        className="mt-2 w-full rounded-xl bg-white/[0.05] border border-white/[0.15] px-3 py-2.5 text-base text-white placeholder:text-white/35 focus:outline-none focus:border-white/40 disabled:opacity-50"
      />
      <p className="text-[11px] text-white/45 mt-1.5 flex items-center gap-1.5">
        {state === 'saving' && <Loader2 className="w-3 h-3 animate-spin" />}
        {state === 'saved' && <Check className="w-3 h-3" />}
        {error
          ? <span className="text-white/80">{error}</span>
          : displayName
            ? `Your coach and your journal will call you ${displayName}.`
            : 'Your coach will avoid using a name until you set one.'}
      </p>
    </div>
  )
}
