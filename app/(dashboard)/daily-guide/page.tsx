'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingScreen } from '@/components/ui/LoadingSpinner'

/**
 * /daily-guide — retired, and redirecting.
 *
 * The page was a second daily ritual: its own greeting, its own mood check,
 * its own quote, its own briefing and its own four segments, all beside a
 * home screen that now carries the era loop. Two rituals in one app means
 * neither is THE thing you open it for.
 *
 * The sessions themselves are not going anywhere: Today's Audio on home
 * plays the segment for the time of day, a tapped reminder plays the one it
 * was about, finishing either still checks the segment in and awards the XP,
 * and the four reminders still arrive. It is the surface that went, not the
 * content — the screen and its components are deleted, not hidden.
 *
 * This file stays as a redirect instead of being deleted, because five kinds
 * of push notification and any number of native shells point here, and a
 * 404 is a terrible thing to hand someone who tapped a reminder. The
 * ?session= param travels with them so they land on the card they were
 * promised.
 *
 * /daily-guide/onboarding is untouched — that is the setup flow, and it is
 * still where a new person configures their sessions.
 */
export default function RetiredDailyGuidePage() {
  const router = useRouter()

  useEffect(() => {
    const session = new URLSearchParams(window.location.search).get('session')
    router.replace(session ? `/?session=${encodeURIComponent(session)}` : '/')
  }, [router])

  return <LoadingScreen />
}
