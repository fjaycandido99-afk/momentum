/**
 * Generate VAPID keys for web push notifications
 * Run: npx ts-node scripts/generate-vapid-keys.ts
 *
 * Copy the output to your .env file:
 * - VAPID_PUBLIC_KEY
 * - VAPID_PRIVATE_KEY
 * - NEXT_PUBLIC_VAPID_PUBLIC_KEY (same as VAPID_PUBLIC_KEY)
 */

import webPush from 'web-push'

const vapidKeys = webPush.generateVAPIDKeys()

console.log('\n=== VAPID Keys Generated ===\n')
console.log('Add these to your .env file:\n')
console.log(`VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`)
console.log(`VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"`)
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`)
console.log('\n============================\n')
console.log('Note: The NEXT_PUBLIC_ prefix makes the public key available to the browser.')
console.log('Never expose your VAPID_PRIVATE_KEY to the client!\n')
