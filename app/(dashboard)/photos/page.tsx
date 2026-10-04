'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Loader2, Lock, X } from 'lucide-react'
import { BackButton } from '@/components/ui/BackButton'
import { ScrollLock } from '@/components/ui/ScrollLock'
import { shrinkPhoto } from '@/lib/photos/shrink'
import { haptic } from '@/lib/haptics'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const short = (d: string) => { const [y, m, day] = d.split('-').map(Number); return `${MONTHS[m - 1]} ${day}, ${y}` }

interface Photo { id: string; day: string; eraId: string | null; url: string | null }

/**
 * Progress photos — a private vault. Theirs only: a private bucket, links
 * that expire, never shared, never read by Voxu's AI. Deleting is one tap
 * and a confirm; deleting the account deletes every photo.
 */
export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[] | null>(null)
  const [max, setMax] = useState(100)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<Photo | null>(null)
  const [compare, setCompare] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/photos', { cache: 'no-store' })
      const d = r.ok ? await r.json() : null
      if (!d) { setError('Couldn’t load your photos.'); setPhotos([]); return }
      setPhotos(d.photos ?? [])
      setMax(d.max ?? 100)
    } catch {
      setError('Couldn’t load your photos.')
      setPhotos([])
    }
  }, [])
  useEffect(() => { load() }, [load])

  const add = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const data = await shrinkPhoto(file)
      const r = await fetch('/api/photos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) })
      const d = await r.json().catch(() => null)
      if (!r.ok) { setError(d?.error ?? 'Couldn’t save that photo.'); return }
      haptic('success')
      await load()
    } catch {
      setError('Couldn’t read that photo.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  const remove = async (p: Photo) => {
    setBusy(true)
    try {
      const r = await fetch(`/api/photos?id=${encodeURIComponent(p.id)}`, { method: 'DELETE' })
      if (r.ok) { setOpen(null); setConfirmDelete(false); await load() }
      else setError('Couldn’t delete that photo.')
    } finally {
      setBusy(false)
    }
  }

  const first = photos && photos.length ? photos[photos.length - 1] : null

  return (
    <div className="h-[100dvh] overflow-y-auto overflow-x-hidden overscroll-contain text-white" data-app-shell>
      <div className="max-w-md md:max-w-lg mx-auto px-5 pb-16" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
        <BackButton fallback="/profile" />
        <p className="text-px-11 uppercase tracking-[0.24em] text-white/60 mt-4">Your record</p>
        <h1 className="text-px-34 leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>Progress photos</h1>
        <p className="text-px-13 text-white/65 mt-2 flex items-start gap-1.5 leading-snug">
          <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
          Private to you. Never shared, never read by Voxu&rsquo;s AI. Delete any time.
        </p>

        <input ref={input} type="file" accept="image/*" className="hidden" onChange={e => add(e.target.files?.[0])} />
        <button
          onClick={() => input.current?.click()}
          disabled={busy || (photos?.length ?? 0) >= max}
          className="tap-44 mt-5 w-full py-3.5 rounded-2xl bg-white text-black text-px-15 font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50 press-scale"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} Add a photo
        </button>
        {photos && <p className="text-px-11 text-white/45 mt-2 text-center">{photos.length} of {max}</p>}
        {error && <p className="text-px-13 text-white/75 mt-3" role="status">{error}</p>}

        {!photos ? (
          <div className="mt-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-white/60" /></div>
        ) : photos.length === 0 ? (
          <p className="text-px-14 text-white/65 mt-8 leading-relaxed">
            One photo a week, same spot, same light, is enough. Day 1 is the one you&rsquo;ll be glad you took.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-3 gap-1.5">
            {photos.map(p => (
              <button key={p.id} onClick={() => { setOpen(p); setCompare(false); setConfirmDelete(false) }} className="relative aspect-[3/4] rounded-lg overflow-hidden bg-white/5" aria-label={`Photo from ${short(p.day)}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.url && <img src={p.url} alt="" className="w-full h-full object-cover" loading="lazy" />}
                <span className="absolute bottom-0 inset-x-0 px-1.5 py-1 text-px-10 text-white bg-gradient-to-t from-black/80 to-transparent text-left">{short(p.day)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] bg-black flex flex-col overflow-x-hidden" role="dialog" aria-modal="true" aria-label={`Photo from ${short(open.day)}`} style={{ height: '100dvh' }}>
          <ScrollLock />
          <div className="flex items-center justify-between px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}>
            <p className="text-px-13 text-white/80">{short(open.day)}</p>
            <button onClick={() => setOpen(null)} aria-label="Close" className="tap-44 p-2 rounded-full bg-white/10"><X className="w-5 h-5" /></button>
          </div>
          <div className={`flex-1 min-h-0 p-3 grid gap-2 ${compare && first && first.id !== open.id ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {compare && first && first.id !== open.id && (
              <figure className="min-h-0 flex flex-col">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {first.url && <img src={first.url} alt={`First photo, ${short(first.day)}`} className="flex-1 min-h-0 w-full object-contain" />}
                <figcaption className="text-px-11 text-white/60 text-center mt-1">First · {short(first.day)}</figcaption>
              </figure>
            )}
            <figure className="min-h-0 flex flex-col">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {open.url && <img src={open.url} alt={`Photo from ${short(open.day)}`} className="flex-1 min-h-0 w-full object-contain" />}
              {compare && <figcaption className="text-px-11 text-white/60 text-center mt-1">{short(open.day)}</figcaption>}
            </figure>
          </div>
          <div className="px-4 flex gap-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}>
            {first && first.id !== open.id && (
              <button onClick={() => setCompare(c => !c)} className="tap-44 flex-1 py-3 rounded-xl border border-white/20 text-px-13">{compare ? 'Just this one' : 'Compare with the first'}</button>
            )}
            {confirmDelete ? (
              <button onClick={() => remove(open)} disabled={busy} className="tap-44 flex-1 py-3 rounded-xl bg-white text-black text-px-13 font-medium">{busy ? 'Deleting…' : 'Delete for good'}</button>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="tap-44 flex-1 py-3 rounded-xl border border-white/20 text-px-13 text-white/80">Delete</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
