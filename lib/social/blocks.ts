/**
 * Block helpers — the small surface every social read/write path uses
 * to enforce mutual invisibility between blocker and blocked users.
 *
 * Semantics:
 *   - If A blocks B: A doesn't see B's posts/comments/reactions, and
 *     B can't react/comment/follow on A's content.
 *   - getBlockedUserIds(userId) returns BOTH directions in one set so
 *     a single `NOT IN (...)` filter on feed queries handles both.
 *   - isBlockedByMe / isBlockingMe accessors let action endpoints
 *     return the right error message ("You blocked this user" vs
 *     "You can't interact with this user").
 *
 * Performance: this query runs on every feed read. For v1 we just hit
 * the DB each time (most users have 0 blocks → tiny query). If this
 * becomes a hot path, cache per-request via React's `cache()` or pin
 * an LRU keyed by userId.
 */

import { prisma } from '@/lib/prisma'

export interface BlockState {
  /** Users this user blocked (won't see their content). */
  blockedByMe: Set<string>
  /** Users who blocked this user (their content blocks YOU too). */
  blockingMe: Set<string>
  /** Union of both — convenient for feed `NOT IN` filters. */
  all: Set<string>
}

export async function getBlockState(userId: string): Promise<BlockState> {
  const [outbound, inbound] = await Promise.all([
    prisma.socialBlock.findMany({
      where: { blocker_id: userId },
      select: { blocked_id: true },
    }),
    prisma.socialBlock.findMany({
      where: { blocked_id: userId },
      select: { blocker_id: true },
    }),
  ])
  const blockedByMe = new Set(outbound.map(r => r.blocked_id))
  const blockingMe = new Set(inbound.map(r => r.blocker_id))
  const all = new Set<string>([...blockedByMe, ...blockingMe])
  return { blockedByMe, blockingMe, all }
}

/** Convenience for "list of user IDs to exclude from feed queries". */
export async function getBlockedUserIds(userId: string): Promise<string[]> {
  const state = await getBlockState(userId)
  return Array.from(state.all)
}

/** Boolean check between two specific users — both directions. */
export async function isBlocked(viewerId: string, targetId: string): Promise<{ blocked: boolean; direction: 'by_me' | 'by_them' | null }> {
  if (viewerId === targetId) return { blocked: false, direction: null }
  const [byMe, byThem] = await Promise.all([
    prisma.socialBlock.findUnique({ where: { blocker_id_blocked_id: { blocker_id: viewerId, blocked_id: targetId } } }).catch(() => null),
    prisma.socialBlock.findUnique({ where: { blocker_id_blocked_id: { blocker_id: targetId, blocked_id: viewerId } } }).catch(() => null),
  ])
  if (byMe) return { blocked: true, direction: 'by_me' }
  if (byThem) return { blocked: true, direction: 'by_them' }
  return { blocked: false, direction: null }
}
