'use client'

import { useEffect } from 'react'
import { REFERRAL_COOKIE } from '@/lib/referral/codes'

/**
 * Attributes a signup to the referral link they arrived on, once.
 *
 * Runs after sign-in (mounted in the dashboard providers), only when the
 * cookie from /i/<code> is present, and remembers locally that it asked so
 * a reload doesn't call again. The server is the real guard — one signup row
 * per person per code — this just keeps the network quiet.
 */
export function ReferralClaim() {
  useEffect(() => {
    const hasCookie = document.cookie.split('; ').some(c => c.startsWith(`${REFERRAL_COOKIE}=`))
    if (!hasCookie) return

    const doneKey = 'voxu-ref-claimed'
    try { if (localStorage.getItem(doneKey)) return } catch { /* storage blocked — the server still dedupes */ }

    fetch('/api/referral/claim', { method: 'POST' })
      .then(() => { try { localStorage.setItem(doneKey, '1') } catch { /* fine */ } })
      .catch(() => { /* bookkeeping; never surfaced */ })
  }, [])
  return null
}
