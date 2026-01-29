/**
 * FCM (Firebase Cloud Messaging) HTTP v1 Delivery
 * Uses the firebase-admin SDK for authenticated push to Android devices.
 */

import * as admin from 'firebase-admin'

let firebaseApp: admin.app.App | null = null
let initAttempted = false

/**
 * Check whether FCM env vars are configured
 */
export function isFCMConfigured(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  )
}

/**
 * Initialize Firebase Admin SDK (singleton)
 */
function initFirebaseAdmin(): admin.app.App | null {
  if (firebaseApp) return firebaseApp
  if (initAttempted) return null

  initAttempted = true

  if (!isFCMConfigured()) {
    console.warn('[FCM] Firebase credentials not configured. Android push notifications will not work.')
    return null
  }

  try {
    // Handle the private key — env vars encode \n as literal backslash-n
    const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n')

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey,
      }),
    })

    console.log('[FCM] Firebase Admin initialized')
    return firebaseApp
  } catch (error: any) {
    console.error('[FCM] Firebase Admin init failed:', error.message)
    return null
  }
}

export interface FCMPayload {
  title: string
  body: string
  icon?: string
  data?: Record<string, string>
}

export interface FCMResult {
  success: boolean
  messageId?: string
  reason?: string
  unregistered?: boolean
}

/**
 * Send a push notification to an Android device via FCM
 */
export async function sendFCMNotification(
  deviceToken: string,
  payload: FCMPayload
): Promise<FCMResult> {
  const app = initFirebaseAdmin()
  if (!app) {
    return { success: false, reason: 'Firebase Admin not initialized' }
  }

  try {
    const message: admin.messaging.Message = {
      token: deviceToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      android: {
        priority: 'high' as const,
        notification: {
          icon: payload.icon || 'ic_notification',
          sound: 'default',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      data: payload.data,
    }

    const messageId = await admin.messaging(app).send(message)
    return { success: true, messageId }
  } catch (error: any) {
    const code = error.code || error.errorInfo?.code || ''

    // Token is no longer valid — device unregistered
    if (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token'
    ) {
      console.warn(`[FCM] Token unregistered: ${deviceToken.substring(0, 20)}...`)
      return { success: false, reason: code, unregistered: true }
    }

    console.error(`[FCM] Send failed: ${error.message}`)
    return { success: false, reason: error.message }
  }
}
