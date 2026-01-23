import Stripe from 'stripe'

// Re-export constants for backwards compatibility with server-side code
export {
  FREE_TIER_LIMITS,
  PREMIUM_FEATURES,
  TRIAL_DAYS,
  hasPremiumAccess,
  canStartSession,
  getSessionDurationLimit,
} from './subscription-constants'
export type { SubscriptionTier, SubscriptionStatus } from './subscription-constants'

// Server-side Stripe client (lazy initialization to avoid build-time errors)
let _stripe: Stripe | null = null

export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    if (!_stripe) {
      _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2025-12-15.clover',
        typescript: true,
      })
    }
    return (_stripe as any)[prop]
  }
})

// Price IDs from Stripe Dashboard
export const PRICE_IDS = {
  premium_monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID!,
  premium_yearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID!,
}
