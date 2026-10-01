import { prisma } from '@/lib/prisma'
import { cleanReflection } from './record'

/**
 * Save (or clear) the one line somebody writes to remember an era by. Only
 * their own era. Their words, stored as written (one line, capped) — never
 * generated, never read for anything but showing back to them.
 */
export async function saveEraReflection(
  userId: string,
  eraId: unknown,
  text: unknown,
): Promise<{ ok: true; reflection: string | null } | { ok: false; status: number; error: string }> {
  if (typeof eraId !== 'string' || !eraId) return { ok: false, status: 400, error: 'Which era?' }
  const era = await prisma.era.findFirst({ where: { id: eraId, user_id: userId }, select: { id: true } })
  if (!era) return { ok: false, status: 404, error: 'Era not found' }
  const reflection = cleanReflection(text)
  await prisma.era.update({ where: { id: era.id }, data: { reflection } })
  return { ok: true, reflection }
}
