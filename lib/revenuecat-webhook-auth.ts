import crypto from 'crypto'

/** Constant-time compare that can't throw on a length mismatch. */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

/**
 * RevenueCat authenticates webhooks with the 'Authorization header value'
 * set in its dashboard (Integrations → Webhooks), sent back verbatim in the
 * Authorization header — it does not sign the body. Accept that value, with
 * or without 'Bearer '.
 */
export function authorizedByHeader(authorization: string | null, secret: string): boolean {
  if (!authorization || !secret) return false
  const value = authorization.trim()
  return safeEqual(value, secret) || safeEqual(value, `Bearer ${secret}`)
}
