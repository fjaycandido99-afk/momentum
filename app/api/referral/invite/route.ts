import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { parseInviteLink, INVITE_CLAIM_DAYS } from '@/lib/referral/invite-link'
import { attributeReferral } from '@/lib/referral/attribute'
import { getActiveEra, recordReferral } from '@/lib/era/service'
import { sendPushToUser } from '@/lib/push-service'
import { firstName } from '@/lib/era/circle'
import { eraName } from '@/lib/era/presets'

export const dynamic = 'force-dynamic'

/**
 * POST { link } — "Did a friend invite you?" (components/referral/InviteAsk).
 *
 * The App Store drops the link between tapping it and installing, so the
 * person says where they came from:
 *   a friend's /join/<era>?from=<id> link → credits that era (EraReferral)
 *     against their own running era, and the friend hears once;
 *   a creator /i/<code> link or code → the signup credit the cookie would
 *     have given (ReferralHit), once per person.
 *
 * Only within INVITE_CLAIM_DAYS of signing up, and only ever one signup
 * credit, so it can't be shopped around later.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { allowed } = rateLimit(`invite-claim:${user.id}`, { limit: 6, windowSeconds: 600 })
    if (!allowed) return NextResponse.json({ error: 'Too many tries. Try again later.' }, { status: 429 })

    const body = await request.json().catch(() => null)
    const link = parseInviteLink(body?.link)
    if (!link) return NextResponse.json({ error: 'That doesn’t look like a Voxu invite link or code.' }, { status: 400 })

    const account = await prisma.user.findUnique({ where: { id: user.id }, select: { created_at: true, name: true } })
    if (account && Date.now() - account.created_at.getTime() > INVITE_CLAIM_DAYS * 86400000) {
      return NextResponse.json({ error: 'Invites can only be added in your first two weeks.' }, { status: 400 })
    }

    if (link.kind === 'era') {
      const mine = await getActiveEra(user.id)
      if (!mine) return NextResponse.json({ error: 'Start your era first, then add who invited you.' }, { status: 400 })
      const inviter = await recordReferral(user.id, mine.id, mine.era_key, link.eraId)
      if (inviter) {
        try {
          await sendPushToUser(inviter, 'era_join', {
            title: `${firstName(account?.name)} joined your era`,
            body: `They started day 1 of ${eraName(mine.title)} from your link.`,
          })
        } catch (err) {
          console.warn('[invite] join notice not sent:', err)
        }
      }
      // Credited, already credited, or it was their own link: the same calm answer.
      return NextResponse.json({ ok: true, kind: 'era' })
    }

    const code = await prisma.referralCode.findUnique({ where: { code: link.code }, select: { id: true, active: true } })
    if (!code || !code.active) return NextResponse.json({ error: 'That code isn’t active.' }, { status: 400 })
    const existing = await prisma.referralHit.findFirst({ where: { user_id: user.id, kind: 'signup' }, select: { id: true } })
    if (!existing) {
      await prisma.referralHit.create({ data: { code_id: code.id, kind: 'signup', user_id: user.id } })
      if (await getActiveEra(user.id)) await attributeReferral(user.id, 'era')
    }
    return NextResponse.json({ ok: true, kind: 'code' })
  } catch (error) {
    console.error('[invite claim] error:', error)
    return NextResponse.json({ error: 'Couldn’t add that just now.' }, { status: 500 })
  }
}
