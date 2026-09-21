import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { normalizeCode, REFERRAL_COOKIE } from '@/lib/referral/codes'

export const dynamic = 'force-dynamic'

/**
 * POST /api/referral/claim — attributes a signup to the code they arrived on.
 *
 * Called once by the app after sign-in. The code comes from the cookie the
 * /i/<code> link set, so the client can't nominate an arbitrary code for
 * itself; and the row is unique per (code, kind, user), so a reinstall, a
 * refresh or a second device cannot turn one person into two payouts.
 *
 * Silent about everything: this is bookkeeping, and nothing the user does
 * should depend on whether it worked.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: true, claimed: false })

    const code = normalizeCode(request.cookies.get(REFERRAL_COOKIE)?.value)
    if (!code) return NextResponse.json({ ok: true, claimed: false })

    const row = await prisma.referralCode.findUnique({ where: { code }, select: { id: true, active: true } })
    if (!row || !row.active) return NextResponse.json({ ok: true, claimed: false })

    // Already attributed to this person, or attributed for the first time.
    await prisma.referralHit.upsert({
      where: { code_id_kind_user_id: { code_id: row.id, kind: 'signup', user_id: user.id } },
      create: { code_id: row.id, kind: 'signup', user_id: user.id },
      update: {},
    })
    return NextResponse.json({ ok: true, claimed: true })
  } catch (error) {
    console.error('[referral claim] error:', error)
    return NextResponse.json({ ok: true, claimed: false })
  }
}
