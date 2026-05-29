/**
 * Handle helpers — generate / validate the @-style usernames that
 * SocialProfile.handle stores. Lazily created on first share; users
 * can rename later in Settings.
 */
import { prisma } from '@/lib/prisma'

const RESERVED = new Set(['admin', 'voxu', 'arlo', 'root', 'system', 'support', 'me', 'self'])

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24)
    || 'user'
}

export function isValidHandle(h: string): boolean {
  if (!h || h.length < 3 || h.length > 24) return false
  if (!/^[a-z0-9_]+$/.test(h)) return false
  if (RESERVED.has(h)) return false
  return true
}

/**
 * Resolve a user to a SocialProfile. If they don't have one yet,
 * mint one with a slugified version of their name / email + a numeric
 * suffix if needed for uniqueness.
 */
export async function ensureProfile(userId: string): Promise<{ id: string; handle: string; display_name: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = await (prisma as any).socialProfile.findUnique({ where: { user_id: userId } })
  if (p) return p

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  })
  if (!user) throw new Error('User not found')

  const base = slugify(user.name || user.email.split('@')[0] || 'user')
  let handle = base
  let attempt = 0
  // Walk numeric suffixes until unique.
  while (attempt < 50) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exists = await (prisma as any).socialProfile.findUnique({ where: { handle } })
    if (!exists && !RESERVED.has(handle)) break
    attempt++
    handle = `${base}${attempt + 1}`
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const created = await (prisma as any).socialProfile.create({
    data: {
      user_id: userId,
      handle,
      display_name: user.name || handle,
    },
  })
  return created
}
