import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { currentAdmin } from '@/lib/auth/admin'
import { codeFromLabel, conversionOf, normalizeCode, referralUrl, type ReferralStat } from '@/lib/referral/codes'

export const dynamic = 'force-dynamic'

/**
 * The referral links, for the owner only (lib/auth/admin).
 *
 * GET   — every code with its clicks, signups and conversion.
 * POST  — { label, code? } creates one; the code is suggested from the label
 *         when not given.
 * PATCH — { code, active } retires or revives one. Never deletes: the
 *         numbers a code earned are the record a bonus was paid against.
 */
async function stats(): Promise<ReferralStat[]> {
  const codes = await prisma.referralCode.findMany({ orderBy: { created_at: 'desc' } })
  const counts = await prisma.referralHit.groupBy({
    by: ['code_id', 'kind'],
    _count: { _all: true },
  })

  const at = (id: string, kind: string) =>
    counts.find(c => c.code_id === id && c.kind === kind)?._count._all ?? 0

  return codes.map(c => {
    const clicks = at(c.id, 'click')
    const signups = at(c.id, 'signup')
    return {
      code: c.code,
      label: c.label,
      active: c.active,
      clicks,
      signups,
      conversion: conversionOf(signups, clicks),
      url: referralUrl(c.code),
      createdAt: c.created_at.toISOString(),
    }
  })
}

export async function GET() {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json({ codes: await stats() })
  } catch (error) {
    console.error('[admin referrals GET] error:', error)
    return NextResponse.json({ error: 'Could not load the links' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json().catch(() => null)
    const label = typeof body?.label === 'string' ? body.label.trim().slice(0, 80) : ''
    if (!label) return NextResponse.json({ error: 'Give it a label so you know who it went to.' }, { status: 400 })

    const code = normalizeCode(body?.code) ?? codeFromLabel(label)
    if (!code) {
      return NextResponse.json(
        { error: 'That code will not work in a link — lower case letters, numbers and dashes, 2–24 characters.' },
        { status: 400 },
      )
    }

    const existing = await prisma.referralCode.findUnique({ where: { code }, select: { id: true } })
    if (existing) {
      return NextResponse.json({ error: `The code "${code}" is already in use.` }, { status: 409 })
    }

    await prisma.referralCode.create({ data: { code, label } })
    return NextResponse.json({ ok: true, url: referralUrl(code), codes: await stats() })
  } catch (error) {
    console.error('[admin referrals POST] error:', error)
    return NextResponse.json({ error: 'Could not create the link' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json().catch(() => null)
    const code = normalizeCode(body?.code)
    if (!code || typeof body?.active !== 'boolean') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    await prisma.referralCode.update({ where: { code }, data: { active: body.active } })
    return NextResponse.json({ ok: true, codes: await stats() })
  } catch (error) {
    console.error('[admin referrals PATCH] error:', error)
    return NextResponse.json({ error: 'Could not update the link' }, { status: 500 })
  }
}
