import { prisma } from '@/lib/prisma'
import type { MindsetId } from './types'
import { MINDSET_CONFIGS } from './configs'

/**
 * Server-side helper: fetches the user's mindset from the database.
 * Returns 'stoic' as default if not set or invalid.
 */
export async function getUserMindset(userId: string): Promise<MindsetId> {
  try {
    const prefs = await prisma.userPreferences.findUnique({
      where: { user_id: userId },
      select: { mindset: true },
    })
    const mindset = prefs?.mindset as MindsetId | undefined
    if (mindset && mindset in MINDSET_CONFIGS) {
      return mindset
    }
  } catch {
    // Non-fatal — fall back to default
  }
  return 'stoic'
}
