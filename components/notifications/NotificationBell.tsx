'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { isNativeApp, isPushSupported, subscribeToPush } from '@/lib/push-notifications'

type PushState = 'granted' | 'prompt' | 'denied' | 'unsupported' | 'unknown'

/**
 * The header bell. Its job is the era loop's plumbing: the 8pm "did you keep
 * your promise?" and the morning promise reminder only reach someone whose
 * notifications are on. So the bell shows a dot until they are, and tapping it
 * asks — instead of being a decorative icon that opens a list.
 *
 * Once on (or explicitly blocked, which only Settings/iOS can undo) it opens
 * the notification settings.
 */
async function readPushState(): Promise<PushState> {
  try {
    if (isNativeApp()) {
      const { PushNotifications } = await import('@capacitor/push-notifications')
      const perm = await PushNotifications.checkPermissions()
      return perm.receive === 'granted' ? 'granted' : perm.receive === 'denied' ? 'denied' : 'prompt'
    }
    if (!isPushSupported() || typeof Notification === 'undefined') return 'unsupported'
    return Notification.permission === 'granted' ? 'granted' : Notification.permission === 'denied' ? 'denied' : 'prompt'
  } catch {
    return 'unknown'
  }
}

export function NotificationBell() {
  const router = useRouter()
  const [state, setState] = useState<PushState>('unknown')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    readPushState().then(s => { if (!cancelled) setState(s) })
    return () => { cancelled = true }
  }, [])

  const onTap = useCallback(async () => {
    if (busy) return
    if (state === 'prompt') {
      setBusy(true)
      try {
        await subscribeToPush()
      } catch {
        // Denied or unavailable — readPushState below reflects which.
      }
      setState(await readPushState())
      setBusy(false)
      return
    }
    router.push('/settings#notifications')
  }, [busy, state, router])

  const needsAttention = state === 'prompt'

  return (
    <button
      onClick={onTap}
      disabled={busy}
      aria-label={needsAttention ? 'Turn on notifications' : 'Notification settings'}
      className="relative p-2 rounded-full press-scale focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none disabled:opacity-50"
    >
      <Bell className="w-5 h-5 text-white/80" />
      {needsAttention && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white ring-2 ring-black" aria-hidden />
      )}
    </button>
  )
}
