import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// RevenueCat webhook event types
type RevenueCatEvent =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'CANCELLATION'
  | 'UNCANCELLATION'
  | 'NON_RENEWING_PURCHASE'
  | 'SUBSCRIPTION_PAUSED'
  | 'EXPIRATION'
  | 'BILLING_ISSUE'
  | 'PRODUCT_CHANGE'
  | 'TRANSFER'

interface RevenueCatWebhookPayload {
  api_version: string
  event: {
    type: RevenueCatEvent
    app_user_id: string
    aliases: string[]
    original_app_user_id: string
    product_id: string
    entitlement_id: string | null
    entitlement_ids: string[]
    period_type: 'NORMAL' | 'TRIAL' | 'INTRO'
    purchased_at_ms: number
    expiration_at_ms: number | null
    store: 'APP_STORE' | 'PLAY_STORE' | 'STRIPE' | 'PROMOTIONAL'
    environment: 'SANDBOX' | 'PRODUCTION'
    is_trial_conversion: boolean | null
    cancel_reason: string | null
    is_family_share: boolean
    country_code: string
    subscriber_attributes: Record<string, { value: string; updated_at_ms: number }>
    price: number | null
    currency: string | null
    price_in_purchased_currency: number | null
    takehome_percentage: number | null
  }
}

function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha1', secret)
    .update(body)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-revenuecat-signature')

    // Verify webhook signature (mandatory)
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('REVENUECAT_WEBHOOK_SECRET not configured')
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      )
    }
    if (!verifyWebhookSignature(body, signature, webhookSecret)) {
      console.error('Invalid RevenueCat webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const payload: RevenueCatWebhookPayload = JSON.parse(body)
    const event = payload.event

    console.log(`RevenueCat webhook: ${event.type} for user ${event.app_user_id}`)

    // Find user by RevenueCat user ID or original app user ID
    const userId = event.app_user_id || event.original_app_user_id

    // Handle different event types
    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
      case 'NON_RENEWING_PURCHASE': {
        await handleSubscriptionActive(userId, event)
        break
      }

      case 'CANCELLATION': {
        await handleSubscriptionCanceled(userId, event)
        break
      }

      case 'EXPIRATION': {
        await handleSubscriptionExpired(userId, event)
        break
      }

      case 'BILLING_ISSUE': {
        await handleBillingIssue(userId, event)
        break
      }

      case 'PRODUCT_CHANGE': {
        await handleSubscriptionActive(userId, event)
        break
      }

      case 'SUBSCRIPTION_PAUSED': {
        await handleSubscriptionPaused(userId, event)
        break
      }

      default:
        console.log(`Unhandled RevenueCat event: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('RevenueCat webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionActive(
  userId: string,
  event: RevenueCatWebhookPayload['event']
) {
  const isTrialing = event.period_type === 'TRIAL'
  const expirationDate = event.expiration_at_ms
    ? new Date(event.expiration_at_ms)
    : null

  await prisma.subscription.upsert({
    where: { revenuecat_user_id: userId },
    update: {
      tier: 'premium',
      status: isTrialing ? 'trialing' : 'active',
      trial_start: isTrialing ? new Date(event.purchased_at_ms) : undefined,
      trial_end: isTrialing ? expirationDate : undefined,
      billing_period_end: expirationDate,
    },
    create: {
      user_id: userId,
      revenuecat_user_id: userId,
      tier: 'premium',
      status: isTrialing ? 'trialing' : 'active',
      trial_start: isTrialing ? new Date(event.purchased_at_ms) : null,
      trial_end: isTrialing ? expirationDate : null,
      billing_period_end: expirationDate,
    },
  })
}

async function handleSubscriptionCanceled(
  userId: string,
  event: RevenueCatWebhookPayload['event']
) {
  await prisma.subscription.updateMany({
    where: { revenuecat_user_id: userId },
    data: {
      status: 'canceled',
      // Keep premium access until expiration
      billing_period_end: event.expiration_at_ms
        ? new Date(event.expiration_at_ms)
        : undefined,
    },
  })
}

async function handleSubscriptionExpired(
  userId: string,
  event: RevenueCatWebhookPayload['event']
) {
  await prisma.subscription.updateMany({
    where: { revenuecat_user_id: userId },
    data: {
      tier: 'free',
      status: 'expired',
      billing_period_end: null,
    },
  })
}

async function handleBillingIssue(
  userId: string,
  event: RevenueCatWebhookPayload['event']
) {
  // Log billing issue but keep premium access for grace period
  console.log(`Billing issue for user ${userId}: ${event.cancel_reason}`)

  // Optionally notify user about billing issue
  // You could add a billing_issue flag to the subscription model
}

async function handleSubscriptionPaused(
  userId: string,
  event: RevenueCatWebhookPayload['event']
) {
  await prisma.subscription.updateMany({
    where: { revenuecat_user_id: userId },
    data: {
      status: 'canceled', // Treat paused as canceled
      billing_period_end: event.expiration_at_ms
        ? new Date(event.expiration_at_ms)
        : undefined,
    },
  })
}
