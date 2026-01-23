// RevenueCat integration for mobile (iOS/Android) subscriptions
// Note: This requires @revenuecat/purchases-capacitor to be installed

import type { SubscriptionTier, SubscriptionStatus } from './stripe'

// RevenueCat product identifiers (configure these in RevenueCat dashboard)
export const REVENUECAT_PRODUCTS = {
  premium_monthly: 'momentum_premium_monthly',
  premium_yearly: 'momentum_premium_yearly',
}

// RevenueCat entitlement identifier
export const PREMIUM_ENTITLEMENT = 'premium'

// Type definitions for RevenueCat
export interface RevenueCatCustomerInfo {
  entitlements: {
    active: {
      [key: string]: {
        identifier: string
        isActive: boolean
        willRenew: boolean
        expirationDate: string | null
        productIdentifier: string
        isSandbox: boolean
      }
    }
  }
  activeSubscriptions: string[]
  allExpirationDates: { [key: string]: string | null }
}

// Initialize RevenueCat (call this on app startup)
export async function initRevenueCat(userId: string): Promise<void> {
  // Dynamically import to avoid SSR issues
  const { Purchases } = await import('@revenuecat/purchases-capacitor')

  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY

  if (!apiKey) {
    console.warn('RevenueCat API key not configured')
    return
  }

  try {
    await Purchases.configure({
      apiKey,
      appUserID: userId,
    })
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error)
  }
}

// Get current customer info
export async function getCustomerInfo(): Promise<RevenueCatCustomerInfo | null> {
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor')
    const { customerInfo } = await Purchases.getCustomerInfo()
    return customerInfo as RevenueCatCustomerInfo
  } catch (error) {
    console.error('Failed to get customer info:', error)
    return null
  }
}

// Check if user has premium access
export async function hasPremiumAccess(): Promise<boolean> {
  const customerInfo = await getCustomerInfo()
  if (!customerInfo) return false

  const premiumEntitlement = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT]
  return premiumEntitlement?.isActive ?? false
}

// Purchase a product
export async function purchaseProduct(productId: string): Promise<boolean> {
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor')
    const { customerInfo } = await Purchases.purchaseStoreProduct({
      product: { identifier: productId } as any,
    })

    // Check if premium is now active
    const info = customerInfo as RevenueCatCustomerInfo
    return info.entitlements.active[PREMIUM_ENTITLEMENT]?.isActive ?? false
  } catch (error: any) {
    if (error.userCancelled) {
      // User cancelled, not an error
      return false
    }
    console.error('Purchase failed:', error)
    throw error
  }
}

// Restore purchases
export async function restorePurchases(): Promise<boolean> {
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor')
    const { customerInfo } = await Purchases.restorePurchases()

    const info = customerInfo as RevenueCatCustomerInfo
    return info.entitlements.active[PREMIUM_ENTITLEMENT]?.isActive ?? false
  } catch (error) {
    console.error('Restore failed:', error)
    throw error
  }
}

// Get available products
export async function getProducts(): Promise<Array<{
  identifier: string
  title: string
  description: string
  priceString: string
  price: number
}>> {
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor')
    const { products } = await Purchases.getProducts({
      productIdentifiers: Object.values(REVENUECAT_PRODUCTS),
    })

    return products.map((p: any) => ({
      identifier: p.identifier,
      title: p.title,
      description: p.description,
      priceString: p.priceString,
      price: p.price,
    }))
  } catch (error) {
    console.error('Failed to get products:', error)
    return []
  }
}

// Map RevenueCat status to our subscription types
export function mapRevenueCatStatus(customerInfo: RevenueCatCustomerInfo): {
  tier: SubscriptionTier
  status: SubscriptionStatus
  expirationDate: Date | null
} {
  const premiumEntitlement = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT]

  if (!premiumEntitlement?.isActive) {
    return {
      tier: 'free',
      status: 'active',
      expirationDate: null,
    }
  }

  const expirationDate = premiumEntitlement.expirationDate
    ? new Date(premiumEntitlement.expirationDate)
    : null

  const status: SubscriptionStatus = premiumEntitlement.willRenew
    ? 'active'
    : 'canceled'

  return {
    tier: 'premium',
    status,
    expirationDate,
  }
}

// Listen for customer info updates
export async function addCustomerInfoListener(
  callback: (customerInfo: RevenueCatCustomerInfo) => void
): Promise<() => void> {
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor')

    await Purchases.addCustomerInfoUpdateListener(
      (info: any) => {
        callback(info.customerInfo as RevenueCatCustomerInfo)
      }
    )

    // Note: In newer versions, listener removal may need different handling
    return () => {
      // Listener cleanup handled by Capacitor
    }
  } catch (error) {
    console.error('Failed to add listener:', error)
    return () => {}
  }
}
