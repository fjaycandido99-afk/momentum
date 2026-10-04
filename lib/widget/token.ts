import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'

/** Only the hash is ever stored (WidgetToken.token_hash). Server only. */
export function hashWidgetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** The person a widget key belongs to, from "Authorization: Bearer <key>", or null. */
export async function widgetUser(authHeader: string | null): Promise<string | null> {
  const m = authHeader?.match(/^Bearer ([A-Za-z0-9_-]{20,100})$/)
  if (!m) return null
  const row = await prisma.widgetToken.findUnique({ where: { token_hash: hashWidgetToken(m[1]) }, select: { id: true, user_id: true } })
  if (!row) return null
  prisma.widgetToken.update({ where: { id: row.id }, data: { last_used_at: new Date() } }).catch(() => {})
  return row.user_id
}
