import { normalizeCode } from './codes'

/**
 * What someone pasted into "Did a friend invite you?" — pure.
 *
 *   era   a friend's "Join this era" link: voxu.app/join/<era>?from=<their era id>
 *   code  a creator link (voxu.app/i/<code>) or just the code
 *
 * The App Store loses the link between the tap and the install, so the
 * person who got it says where they came from. Anything else is null.
 */
export type InviteLink =
  | { kind: 'era'; eraId: string }
  | { kind: 'code'; code: string }

const ERA_ID = /^[a-z0-9]{8,64}$/i

export function parseInviteLink(input: unknown): InviteLink | null {
  if (typeof input !== 'string') return null
  const raw = input.trim()
  if (!raw || raw.length > 300) return null

  let url: URL | null = null
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : /^(www\.)?voxu\.app\//i.test(raw) ? `https://${raw}` : 'x:')
  } catch { url = null }

  if (url && /(^|\.)voxu\.app$/i.test(url.hostname)) {
    const from = url.searchParams.get('from')
    if (url.pathname.startsWith('/join/') && from && ERA_ID.test(from)) return { kind: 'era', eraId: from }
    const m = url.pathname.match(/^\/i\/([^/]+)\/?$/)
    if (m) {
      const code = normalizeCode(decodeURIComponent(m[1]))
      return code ? { kind: 'code', code } : null
    }
    return null
  }

  // A bare code, as said out loud or typed from a bio.
  const code = normalizeCode(raw)
  return code ? { kind: 'code', code } : null
}

/** How long after signing up someone can still say who invited them. */
export const INVITE_CLAIM_DAYS = 14
