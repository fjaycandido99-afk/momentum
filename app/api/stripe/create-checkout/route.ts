import { NextRequest, NextResponse } from 'next/server'
import { stripe, PRICE_IDS, TRIAL_DAYS } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { priceType } = body // 'monthly' or 'yearly'

    if (!priceType || !['monthly', 'yearly'].includes(priceType)) {
      return NextResponse.json(
        { error: 'Invalid price type' },
        { status: 400 }
      )
    }

    // Get or create subscription record
    let subscription = await prisma.subscription.findUnique({
      where: { user_id: user.id },
    })

    // Get or create Stripe customer
    let stripeCustomerId = subscription?.stripe_customer_id

    if (!stripeCustomerId) {
      // Check if customer already exists by email
      const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      })

      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id
      } else {
        // Create new customer
        const customer = await stripe.customers.create({
          email: user.email!,
          metadata: {
            user_id: user.id,
          },
        })
        stripeCustomerId = customer.id
      }

      // Update subscription record with customer ID
      if (subscription) {
        await prisma.subscription.update({
          where: { user_id: user.id },
          data: { stripe_customer_id: stripeCustomerId },
        })
      } else {
        subscription = await prisma.subscription.create({
          data: {
            user_id: user.id,
            tier: 'free',
            status: 'active',
            stripe_customer_id: stripeCustomerId,
          },
        })
      }
    }

    const priceId = priceType === 'yearly'
      ? PRICE_IDS.premium_yearly
      : PRICE_IDS.premium_monthly

    // Check if user has already had a trial
    const hasHadTrial = subscription.trial_start !== null

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // Only add trial if user hasn't had one before
      ...(hasHadTrial ? {} : {
        subscription_data: {
          trial_period_days: TRIAL_DAYS,
        },
      }),
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?subscription=canceled`,
      metadata: {
        user_id: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      url: checkoutSession.url,
    })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
