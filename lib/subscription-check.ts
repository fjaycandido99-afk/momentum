import { prisma } from './prisma'

/**
 * Check if a user has an active premium subscription.
 * Single source of truth — replaces 19+ duplicate checks across API routes.
 */
export async function isPremiumUser(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({
    where: { user_id: userId },
    select: { tier: true, status: true },
  })
  return sub?.tier === 'premium' && (sub?.status === 'active' || sub?.status === 'trialing')
}
