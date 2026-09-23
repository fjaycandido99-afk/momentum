'use client'

/**
 * The one place the app asks for notifications.
 *
 * Inline, not a modal — home already shows at most one interstitial per open
 * and this must not compete for it. It appears under the promise waiting to
 * be kept, which is the only place where "shall I remind you?" answers a
 * question the person already has.
 *
 * Asked once, ever, whatever the answer. The decision of whether to appear
 * at all lives in lib/notifications/ask.ts, with tests.
 */

import { useEffect, useState } from 'react'
import { Bell, Share, Loader2, Check } from 'lucide-react'
import { subscribeToPush, getNotificationPermission, getPushSupportInfo } from '@/lib/push-notifications'
import { reminderAsk, REMINDER_ASK_ID, type AskKind } from '@/lib/notifications/ask'
import { isDismissed, setDismissed, FOREVER } from '@/lib/ui/dismiss'
import { trackFeature } from '@/lib/analytics/track'

export function ReminderAsk({ hasPromise }: { hasPromise: boolean }) {
  const [kind, setKind] = useState<AskKind>('none')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  // Decided on the client only: every input needs window, navigator or
  // localStorage, so a server render would always compute 'none' and then
  // flip, which is a layout jump under text somebody is reading.
  useEffect(() => {
    const info = getPushSupportInfo()
    const decided = reminderAsk({
      permission: getNotificationPermission(),
      supported: info.supported,
      platform: info.platform,
      isInstalled: info.isInstalled,
      isNative: info.isNative,
      alreadyAsked: isDismissed(REMINDER_ASK_ID),
      hasPromise,
    })
    setKind(decided)
    // Counted, because there was no way to tell "nobody was asked" from
    // "everybody said no" — and those need opposite fixes. Recording the
    // SHOWN event separately also reveals how many people are stuck behind
    // iOS's add-to-home-screen requirement, which no toggle can fix.
    if (decided !== 'none') {
      trackFeature('notification', 'use', `ask_shown:${decided}`)
    }
  }, [hasPromise])

  const close = () => {
    trackFeature('notification', 'disable', `ask_declined:${kind}`)
    setDismissed(REMINDER_ASK_ID, FOREVER)
    setKind('none')
  }

  const turnOn = async () => {
    if (busy) return
    setBusy(true)
    try {
      const sub = await subscribeToPush()
      // Remember the ask happened either way. A failed subscribe is not a
      // reason to ask again tomorrow — if it failed once it will fail again,
      // and Settings is still there.
      setDismissed(REMINDER_ASK_ID, FOREVER)
      if (sub) {
        trackFeature('notification', 'enable', 'ask')
        setDone(true)
      } else {
        // Tapped yes and got nothing back — a subscribe that resolved empty.
        // Tracked apart from a decline, because this one is our bug.
        trackFeature('notification', 'disable', 'ask_failed')
        setKind('none')
      }
    } catch {
      // Permission denied at the OS dialog, or no subscription possible.
      // Nothing to say — they just answered the real prompt.
      trackFeature('notification', 'disable', 'ask_denied')
      setDismissed(REMINDER_ASK_ID, FOREVER)
      setKind('none')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-3 py-2.5">
        <Check className="h-3.5 w-3.5 shrink-0 text-white" />
        <p className="text-xs text-white/70">
          Reminders on. Change what you get in Settings.
        </p>
      </div>
    )
  }

  if (kind === 'none') return null

  if (kind === 'install-first') {
    return (
      <div className="mt-3 rounded-xl border border-white/[0.12] bg-white/[0.04] p-3">
        <div className="flex items-start gap-2.5">
          <Share className="mt-0.5 h-4 w-4 shrink-0 text-white/70" />
          <div className="space-y-1">
            <p className="text-xs font-medium text-white">Want a reminder tonight?</p>
            {/* The real constraint, stated plainly. iPhone Safari cannot do
                notifications for a site — only for one added to the home
                screen — so the ask is the install, not a toggle. */}
            <p className="text-[11px] leading-relaxed text-white/60">
              On iPhone, Voxu can only send reminders once it&rsquo;s on your home screen.
              Tap Share, then <span className="text-white/80">Add to Home Screen</span>, and
              open it from there.
            </p>
          </div>
        </div>
        <button
          onClick={close}
          className="mt-2.5 w-full rounded-lg border border-white/[0.12] bg-white/[0.04] py-2 text-xs text-white/60 transition-colors active:scale-[0.97]"
        >
          Got it
        </button>
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-xl border border-white/[0.12] bg-white/[0.04] p-3">
      <div className="flex items-start gap-2.5">
        <Bell className="mt-0.5 h-4 w-4 shrink-0 text-white/70" />
        <div className="space-y-1">
          <p className="text-xs font-medium text-white">Want a reminder tonight?</p>
          <p className="text-[11px] leading-relaxed text-white/60">
            One nudge to mark whether you kept it. You can change or stop them in Settings.
          </p>
        </div>
      </div>
      <div className="mt-2.5 flex gap-2">
        <button
          onClick={turnOn}
          disabled={busy}
          className="flex-1 rounded-lg bg-white py-2 text-xs font-medium text-black transition-opacity disabled:opacity-60 active:scale-[0.97]"
        >
          {busy ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : 'Remind me'}
        </button>
        <button
          onClick={close}
          disabled={busy}
          className="rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-xs text-white/60 transition-colors disabled:opacity-60 active:scale-[0.97]"
        >
          No thanks
        </button>
      </div>
    </div>
  )
}
