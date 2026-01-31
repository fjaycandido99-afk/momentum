'use client'

import { useState } from 'react'
import { X, Check, Crown, Sparkles, Zap, Clock, Music, Book, Download, Loader2 } from 'lucide-react'
import { useSubscription } from '@/contexts/SubscriptionContext'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
}

const PREMIUM_BENEFITS = [
  { icon: Zap, text: 'Unlimited daily sessions' },
  { icon: Clock, text: 'No time limits' },
  { icon: Music, text: 'All 6 music genres' },
  { icon: Sparkles, text: 'All checkpoints & features' },
  { icon: Book, text: 'Full journal history' },
  { icon: Download, text: 'Offline downloads' },
]

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly')
  const [isLoading, setIsLoading] = useState(false)
  const { refreshSubscription } = useSubscription()

  if (!isOpen) return null

  const handleUpgrade = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceType: billingPeriod }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('No checkout URL returned')
      }
    } catch (error) {
      console.error('Failed to create checkout:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const monthlyPrice = 4.99
  const yearlyPrice = 39.99
  const yearlyMonthly = (yearlyPrice / 12).toFixed(2)
  const savings = Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#1a1a24] to-[#0f0f15] rounded-3xl border border-white/10 overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-10"
        >
          <X className="w-5 h-5 text-white/95" />
        </button>

        {/* Premium badge header */}
        <div className="relative pt-8 pb-6 px-6 text-center">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent" />
          <div className="relative">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 mb-4">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Unlock Premium
            </h2>
            <p className="text-white/95 text-sm">
              Get the full Voxu experience
            </p>
          </div>
        </div>

        {/* Benefits list */}
        <div className="px-6 pb-6">
          <div className="space-y-3">
            {PREMIUM_BENEFITS.map((benefit, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-amber-500/20">
                  <benefit.icon className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-white/95 text-sm">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing toggle */}
        <div className="px-6 pb-4">
          <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-white/10 text-white'
                  : 'text-white/95 hover:text-white/95'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                billingPeriod === 'yearly'
                  ? 'bg-white/10 text-white'
                  : 'text-white/95 hover:text-white/95'
              }`}
            >
              <span>Yearly</span>
              <span className="ml-1.5 text-xs text-amber-400">Save {savings}%</span>
            </button>
          </div>
        </div>

        {/* Price display */}
        <div className="px-6 pb-4 text-center">
          {billingPeriod === 'monthly' ? (
            <div>
              <span className="text-3xl font-bold text-white">${monthlyPrice}</span>
              <span className="text-white/95 text-sm">/month</span>
            </div>
          ) : (
            <div>
              <span className="text-3xl font-bold text-white">${yearlyPrice}</span>
              <span className="text-white/95 text-sm">/year</span>
              <p className="text-white/95 text-xs mt-1">
                Just ${yearlyMonthly}/month
              </p>
            </div>
          )}
        </div>

        {/* CTA Button */}
        <div className="px-6 pb-6">
          <button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-lg hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Start 7-Day Free Trial</span>
              </>
            )}
          </button>
          <p className="text-center text-white/95 text-xs mt-3">
            Cancel anytime. No commitment required.
          </p>
        </div>

        {/* Trust indicators */}
        <div className="px-6 pb-6 flex items-center justify-center gap-4 text-white/95 text-xs">
          <div className="flex items-center gap-1">
            <Check className="w-3 h-3" />
            <span>Secure payment</span>
          </div>
          <div className="flex items-center gap-1">
            <Check className="w-3 h-3" />
            <span>Instant access</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Wrapper component that uses context
export function UpgradeModalWithContext() {
  const { showUpgradeModal, closeUpgradeModal } = useSubscription()
  return <UpgradeModal isOpen={showUpgradeModal} onClose={closeUpgradeModal} />
}
