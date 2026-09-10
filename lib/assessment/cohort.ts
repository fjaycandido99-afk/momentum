import { prisma } from '@/lib/prisma'
import type { Read } from './axes'
import { computeSignature, type Signature } from './signature'

/**
 * "How many people land here too."
 *
 * Shown as a share of reads, never a headcount: a headcount tells someone
 * exactly how few people use the app, and the number they'd screenshot would
 * be the wrong one. Suppressed entirely below MIN_READS_FOR_SHARE — a
 * percentage drawn from a dozen people swings ten points when one person
 * answers a question, and inventing confidence there is the one thing this
 * feature must not do.
 */

/** Reads that must exist before any share is shown at all. */
export const MIN_READS_FOR_SHARE = 50

/** Signatures behind a share are stable; half an hour of staleness is free. */
const TTL_MS = 30 * 60 * 1000

let cache: { at: number; total: number; counts: Map<string, number> } | null = null

async function distribution(): Promise<{ total: number; counts: Map<string, number> }> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache

  // One grouped count over at most 24 buckets — never a per-user scan. This
  // runs on a page a user opens once a day, so it must not scale with rows.
  const rows = await prisma.assessmentSignature.groupBy({
    by: ['signature'],
    _count: { signature: true },
  })

  const counts = new Map<string, number>()
  let total = 0
  for (const row of rows) {
    counts.set(row.signature, row._count.signature)
    total += row._count.signature
  }

  cache = { at: Date.now(), total, counts }
  return cache
}

/**
 * The share of reads landing on this signature, 1..99, or null when it can't
 * be said honestly yet. Null is a rendered state — the line just isn't there.
 */
export async function signatureShare(key: string | null): Promise<number | null> {
  if (!key) return null
  try {
    const { total, counts } = await distribution()
    if (total < MIN_READS_FOR_SHARE) return null
    const mine = counts.get(key) ?? 0
    if (mine === 0) return null
    // Clamped away from 0 and 100: a real cohort is never "0% of reads", and
    // a rounded 100% would claim everyone when it means 99.6%.
    return Math.min(99, Math.max(1, Math.round((mine / total) * 100)))
  } catch {
    // The share is decoration on a read that stands without it.
    return null
  }
}

/** The name this user is currently carrying, if any. */
export async function loadSignatureKey(userId: string): Promise<string | null> {
  try {
    const row = await prisma.assessmentSignature.findUnique({
      where: { user_id: userId },
      select: { signature: true },
    })
    return row?.signature ?? null
  } catch {
    // No stored name means no stickiness, not no read.
    return null
  }
}

/**
 * Write this user's current signature, or clear it when they no longer have
 * one. Called after an answer and when the read is viewed, so the table
 * self-heals for users who answered before it existed.
 *
 * A write only happens when the NAME changes: `answered` is the count behind
 * the name at the moment it was set, so leaving it alone is the honest value
 * rather than a skipped update.
 */
export async function syncSignature(
  userId: string,
  key: string | null,
  answered: number,
  previousKey: string | null,
): Promise<void> {
  if (key === previousKey) return
  try {
    if (!key) {
      await prisma.assessmentSignature.deleteMany({ where: { user_id: userId } })
      return
    }
    await prisma.assessmentSignature.upsert({
      where: { user_id: userId },
      create: { user_id: userId, signature: key, answered },
      update: { signature: key, answered },
    })
  } catch {
    // Derived data. A failed write costs the cohort count one row until the
    // next answer, and costs the user nothing.
  }
}

/**
 * Name a read and keep the stored row in step — the single path every write
 * surface uses, so the home card, the read screen and the answer response can
 * never disagree about what someone is called.
 */
export async function resolveSignature(userId: string, read: Read): Promise<Signature | null> {
  const previousKey = await loadSignatureKey(userId)
  const signature = computeSignature(read, previousKey)
  await syncSignature(userId, signature?.key ?? null, read.answered, previousKey)
  return signature
}

/** Test seam — the TTL cache would otherwise outlive a single test file. */
export function resetCohortCache(): void {
  cache = null
}
