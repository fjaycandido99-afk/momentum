import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeCode, REFERRAL_COOKIE, REFERRAL_COOKIE_DAYS } from '@/lib/referral/codes'

/**
 * GET /i/<code> — the shareable referral link.
 *
 * A route handler rather than a page, because all it does is bookkeeping and
 * a redirect: count the click, remember the code, send them to the download
 * page. No UI means nothing to load before the App Store button appears.
 *
 * An unknown or retired code still lands on /download. Someone who tapped a
 * link in good faith gets the app; only the attribution is dropped.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { code: string } }) {
  const destination = new URL('/download', request.url)
  const response = NextResponse.redirect(destination)

  try {
    const code = normalizeCode(params.code)
    if (!code) return response

    const row = await prisma.referralCode.findUnique({ where: { code }, select: { id: true, active: true } })
    if (!row || !row.active) return response

    // Clicks are anonymous by nature — nobody has signed in yet. The signup
    // that may follow is attributed by /api/referral/claim.
    await prisma.referralHit.create({ data: { code_id: row.id, kind: 'click' } })

    response.cookies.set(REFERRAL_COOKIE, code, {
      maxAge: REFERRAL_COOKIE_DAYS * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
      httpOnly: false, // the app reads it to claim after sign-in
    })
  } catch (error) {
    // A broken counter must never cost someone the download.
    console.error('[referral] click not recorded:', error)
  }

  return response
}
