import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

// Disable body parsing, we need raw body for webhook verification
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  if (!userId) {
    console.error('No user_id in checkout session metadata')
    return
  }

  // Get subscription details from Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription

  const isTrialing = stripeSubscription.status === 'trialing'
  const trialEnd = stripeSubscription.trial_end
    ? new Date(stripeSubscription.trial_end * 1000)
    : null

  // Get billing period from first subscription item
  const firstItem = stripeSubscription.items.data[0]
  const billingPeriodStart = firstItem ? new Date(firstItem.current_period_start * 1000) : null
  const billingPeriodEnd = firstItem ? new Date(firstItem.current_period_end * 1000) : null

  await prisma.subscription.upsert({
    where: { user_id: userId },
    update: {
      tier: 'premium',
      status: isTrialing ? 'trialing' : 'active',
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      trial_start: isTrialing ? new Date() : undefined,
      trial_end: trialEnd,
      billing_period_start: billingPeriodStart,
      billing_period_end: billingPeriodEnd,
    },
    create: {
      user_id: userId,
      tier: 'premium',
      status: isTrialing ? 'trialing' : 'active',
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      trial_start: isTrialing ? new Date() : null,
      trial_end: trialEnd,
      billing_period_start: billingPeriodStart,
      billing_period_end: billingPeriodEnd,
    },
  })
}

async function handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
  const customerId = stripeSubscription.customer as string

  // Find user by Stripe customer ID
  const subscription = await prisma.subscription.findFirst({
    where: { stripe_customer_id: customerId },
  })

  if (!subscription) {
    console.error('No subscription found for customer:', customerId)
    return
  }

  const isTrialing = stripeSubscription.status === 'trialing'
  const isActive = stripeSubscription.status === 'active'
  const isCanceled = stripeSubscription.status === 'canceled' ||
                     stripeSubscription.cancel_at_period_end

  let status: 'active' | 'trialing' | 'canceled' | 'expired' = 'active'
  if (isTrialing) status = 'trialing'
  else if (isCanceled) status = 'canceled'
  else if (!isActive) status = 'expired'

  // Get billing period from first subscription item
  const firstItem = stripeSubscription.items.data[0]
  const billingPeriodStart = firstItem ? new Date(firstItem.current_period_start * 1000) : null
  const billingPeriodEnd = firstItem ? new Date(firstItem.current_period_end * 1000) : null

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      tier: 'premium',
      status,
      stripe_subscription_id: stripeSubscription.id,
      trial_end: stripeSubscription.trial_end
        ? new Date(stripeSubscription.trial_end * 1000)
        : null,
      billing_period_start: billingPeriodStart,
      billing_period_end: billingPeriodEnd,
    },
  })
}

async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
  const customerId = stripeSubscription.customer as string

  const subscription = await prisma.subscription.findFirst({
    where: { stripe_customer_id: customerId },
  })

  if (!subscription) {
    console.error('No subscription found for customer:', customerId)
    return
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      tier: 'free',
      status: 'expired',
      stripe_subscription_id: null,
      billing_period_start: null,
      billing_period_end: null,
    },
  })
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  const subscriptionId = invoice.parent?.subscription_details?.subscription as string | undefined

  if (!subscriptionId) return

  const subscription = await prisma.subscription.findFirst({
    where: { stripe_customer_id: customerId },
  })

  if (!subscription) return

  // Get updated subscription details
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription

  // Get billing period from first subscription item
  const firstItem = stripeSubscription.items.data[0]
  const billingPeriodStart = firstItem ? new Date(firstItem.current_period_start * 1000) : null
  const billingPeriodEnd = firstItem ? new Date(firstItem.current_period_end * 1000) : null

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      tier: 'premium',
      status: 'active',
      billing_period_start: billingPeriodStart,
      billing_period_end: billingPeriodEnd,
    },
  })
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  const subscription = await prisma.subscription.findFirst({
    where: { stripe_customer_id: customerId },
  })

  if (!subscription) return

  // Keep premium but mark as having payment issues
  // In production, you might want to add a payment_failed status
  console.log(`Payment failed for customer ${customerId}`)
}
