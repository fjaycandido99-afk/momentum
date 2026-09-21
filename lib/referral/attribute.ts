import { prisma } from '@/lib/prisma'

/**
 * Credits a later milestone to the referral link someone arrived on.
 *
 * The link is remembered by the SIGNUP row (code_id + user), so a person's
 * code survives long after the cookie is gone — going premium six weeks
 * later still lands against the channel that brought them. Nothing new is
 * stored per user to make that work.
 *
 * Each milestone is one row per person per code, so a resubscribe, a second
 * era or a webhook firing twice can't inflate a channel's numbers.
 *
 * Never throws. A referral counter must never be able to fail a signup, an
 * era or a payment.
 */
export type ReferralMilestone = 'era' | 'pro'

export async function attributeReferral(userId: string, kind: ReferralMilestone): Promise<void> {
  try {
    const signup = await prisma.referralHit.findFirst({
      where: { user_id: userId, kind: 'signup' },
      orderBy: { created_at: 'asc' },
      select: { code_id: true },
    })
    // Most people arrive on their own — that is the normal case, not an error.
    if (!signup) return

    await prisma.referralHit.upsert({
      where: { code_id_kind_user_id: { code_id: signup.code_id, kind, user_id: userId } },
      create: { code_id: signup.code_id, kind, user_id: userId },
      update: {},
    })
  } catch (error) {
    console.warn(`[referral] ${kind} not attributed:`, error)
  }
}
