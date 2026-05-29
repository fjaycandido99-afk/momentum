/**
 * One-tap badge reset — sends a SILENT APNs push (no alert body, just
 * `aps.badge: 0`) to every registered iOS device for the authenticated
 * user. The OS quietly resets the app-icon badge to 0; the user sees no
 * notification on screen.
 *
 * Useful when a stuck legacy badge needs to be cleared without waiting
 * for the next normal push to do it. After this fix went out
 * (apns.ts default badge → 0), every regular push also clears the
 * badge, so this endpoint becomes mostly diagnostic / on-demand.
 *
 * Usage:
 *   GET /api/notifications/clear-badge
 *   → JSON { ok, cleared: <iOS devices touched> }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { sendAPNsNotification, isAPNsConfigured } from '@/lib/apns'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!isAPNsConfigured()) {
      return NextResponse.json({ ok: false, reason: 'APNs not configured' }, { status: 500 })
    }

    const subs = await prisma.pushSubscription.findMany({
      where: { user_id: user.id, platform: 'ios' },
    })

    const results: Array<{ token_prefix: string; status: number; reason?: string }> = []
    for (const sub of subs) {
      if (!sub.native_token) continue
      const r = await sendAPNsNotification(sub.native_token, {
        title: '',
        body: '',
        badge: 0,
      })
      results.push({
        token_prefix: sub.native_token.slice(0, 12) + '…',
        status: r.statusCode,
        reason: r.reason,
      })
    }

    return NextResponse.json({
      ok: results.some(r => r.status === 200),
      cleared: results.filter(r => r.status === 200).length,
      attempted: results.length,
      results,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    )
  }
}
