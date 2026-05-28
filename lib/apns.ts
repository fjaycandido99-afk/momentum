/**
 * APNs (Apple Push Notification service) HTTP/2 Delivery
 * Uses Node.js built-in http2 and crypto modules — no extra dependencies.
 */

import * as http2 from 'http2'
import * as crypto from 'crypto'

// APNs endpoints
const APNS_HOST_PRODUCTION = 'https://api.push.apple.com'
const APNS_HOST_SANDBOX = 'https://api.sandbox.push.apple.com'

// JWT cache — APNs tokens are valid for 60 minutes
let cachedJWT: { token: string; expires: number } | null = null

function getAPNsHost(): string {
  return process.env.APNS_PRODUCTION === 'true'
    ? APNS_HOST_PRODUCTION
    : APNS_HOST_SANDBOX
}

/**
 * Resolve the APNs auth key (the .p8) from env. Accepts BOTH common conventions:
 *   - APNS_AUTH_KEY  or  APNS_KEY  (whichever is set)
 *   - raw PEM (multi-line, with BEGIN/END)  or  base64-encoded .p8 contents
 *
 * This forgiveness matters because the "wrong format" bug is invisible: the
 * server quietly skips every iOS push and NotificationSendLog stays empty.
 */
function getAuthKey(): string {
  const raw = (process.env.APNS_AUTH_KEY || process.env.APNS_KEY || '').trim()
  if (!raw) return ''
  // Raw PEM — normalize any escaped \n that some env stores write literally.
  if (raw.includes('BEGIN PRIVATE KEY') || raw.includes('BEGIN EC PRIVATE KEY')) {
    return raw.replace(/\\n/g, '\n')
  }
  // Otherwise treat as base64-encoded .p8.
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8')
    return decoded.includes('BEGIN') ? decoded : ''
  } catch {
    return ''
  }
}

/**
 * Check whether APNs env vars are configured (including a usable auth key).
 */
export function isAPNsConfigured(): boolean {
  return !!(
    process.env.APNS_KEY_ID &&
    process.env.APNS_TEAM_ID &&
    process.env.APNS_BUNDLE_ID &&
    getAuthKey()
  )
}

/**
 * Generate (or return cached) APNs JWT signed with ES256
 */
function getAPNsJWT(): string {
  const now = Math.floor(Date.now() / 1000)

  // Reuse cached token if still valid (refresh 5 min before expiry)
  if (cachedJWT && cachedJWT.expires > now + 300) {
    return cachedJWT.token
  }

  const keyId = process.env.APNS_KEY_ID!
  const teamId = process.env.APNS_TEAM_ID!
  const authKey = getAuthKey()
  if (!authKey) {
    throw new Error('[APNs] No auth key configured. Set APNS_AUTH_KEY (or APNS_KEY) to the .p8 contents — raw PEM or base64.')
  }

  // JWT header + payload
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ iss: teamId, iat: now })).toString('base64url')
  const signingInput = `${header}.${payload}`

  // Sign with ES256 (ECDSA P-256 + SHA-256)
  try {
    const sign = crypto.createSign('SHA256')
    sign.update(signingInput)
    const signatureDER = sign.sign({ key: authKey, dsaEncoding: 'ieee-p1363' })
    const signature = signatureDER.toString('base64url')

    const token = `${signingInput}.${signature}`

    // Cache for 55 minutes (APNs allows up to 60)
    cachedJWT = { token, expires: now + 55 * 60 }

    return token
  } catch (e) {
    console.error('[APNs] JWT signing failed — verify APNS_AUTH_KEY is the .p8 contents (raw PEM with newlines, or base64 of the .p8 file):', (e as Error).message)
    throw e
  }
}

export interface APNsPayload {
  title: string
  body: string
  badge?: number
  sound?: string
  data?: Record<string, any>
}

export interface APNsResult {
  success: boolean
  statusCode: number
  reason?: string
}

/**
 * Send a push notification to an iOS device via APNs HTTP/2
 */
export async function sendAPNsNotification(
  deviceToken: string,
  payload: APNsPayload
): Promise<APNsResult> {
  const jwt = getAPNsJWT()
  const bundleId = process.env.APNS_BUNDLE_ID!
  const host = getAPNsHost()

  const apnsPayload = JSON.stringify({
    aps: {
      alert: {
        title: payload.title,
        body: payload.body,
      },
      badge: payload.badge ?? 1,
      sound: payload.sound ?? 'default',
    },
    ...payload.data,
  })

  return new Promise<APNsResult>((resolve) => {
    const client = http2.connect(host)

    client.on('error', (err) => {
      console.error('[APNs] Connection error:', err.message)
      client.close()
      resolve({ success: false, statusCode: 0, reason: err.message })
    })

    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${jwt}`,
      'apns-topic': bundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    })

    let responseData = ''
    let statusCode = 0

    req.on('response', (headers) => {
      statusCode = headers[':status'] as number
    })

    req.on('data', (chunk: Buffer) => {
      responseData += chunk.toString()
    })

    req.on('end', () => {
      client.close()

      if (statusCode === 200) {
        resolve({ success: true, statusCode })
      } else {
        let reason = `HTTP ${statusCode}`
        try {
          const parsed = JSON.parse(responseData)
          reason = parsed.reason || reason
        } catch {
          // response may be empty
        }
        console.error(`[APNs] Push failed (${statusCode}): ${reason}`)
        resolve({ success: false, statusCode, reason })
      }
    })

    req.on('error', (err) => {
      client.close()
      console.error('[APNs] Request error:', err.message)
      resolve({ success: false, statusCode: 0, reason: err.message })
    })

    req.write(apnsPayload)
    req.end()
  })
}
