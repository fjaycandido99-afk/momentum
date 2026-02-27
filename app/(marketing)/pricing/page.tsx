'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Crown,
  Check,
  X,
  Zap,
  Clock,
  Music,
  Sparkles,
  Book,
  Download,
  ChevronDown,
  Loader2,
  Shield,
  CreditCard,
} from 'lucide-react'

// Pricing constants
const MONTHLY_PRICE = 6.99
const YEARLY_PRICE = 49.99
const YEARLY_MONTHLY = (YEARLY_PRICE / 12).toFixed(2)
const SAVINGS_PERCENT = Math.round((1 - YEARLY_PRICE / (MONTHLY_PRICE * 12)) * 100)

// Feature comparison data
const FEATURES = [
  {
    name: 'Daily sessions',
    free: '1 per day',
    premium: 'Unlimited',
    icon: Zap,
  },
  {
    name: 'Session duration',
    free: '10 minutes',
    premium: 'No limit',
    icon: Clock,
  },
  {
    name: 'Music genres',
    free: 'Daily rotation only',
    premium: 'All 6 genres',
    icon: Music,
  },
  {
    name: 'Checkpoints',
    free: false,
    premium: true,
    icon: Sparkles,
  },
  {
    name: 'Journal history',
    free: false,
    premium: true,
    icon: Book,
  },
  {
    name: 'Offline downloads',
    free: false,
    premium: true,
    icon: Download,
  },
  {
    name: 'Weekly review',
    free: 'Summary only',
    premium: 'Full insights',
    icon: Sparkles,
  },
  {
    name: 'All backgrounds',
    free: false,
    premium: true,
    icon: Sparkles,
  },
]

// FAQ data
const FAQ_ITEMS = [
  {
    question: 'What happens after my free trial?',
    answer: 'After your 7-day free trial ends, you\'ll be automatically charged based on your selected plan (monthly or yearly). You can cancel anytime before the trial ends to avoid being charged.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes! You can cancel your subscription at any time. If you cancel, you\'ll retain access to premium features until the end of your current billing period.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards, debit cards, and Apple Pay through our secure payment processor Stripe.',
  },
  {
    question: 'Is there a family plan?',
    answer: 'Not currently, but we\'re working on it! Each subscription is for individual use.',
  },
  {
    question: 'Can I switch between monthly and yearly?',
    answer: 'Yes, you can switch your billing period at any time from your account settings. Changes will take effect at your next billing date.',
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly')
  const [isLoading, setIsLoading] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const handleStartTrial = async () => {
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
      } else if (data.error === 'Not authenticated') {
        // Redirect to signup if not logged in
        router.push('/signup?redirect=/pricing')
      } else {
        console.error('Checkout error:', data.error)
      }
    } catch (error) {
      console.error('Failed to create checkout:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-4 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent" />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-400 font-medium">7-day free trial</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Unlock Your Full Potential
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto mb-8">
            Get unlimited access to all premium features and take your focus sessions to the next level.
          </p>

          {/* Quick pricing preview */}
          <div className="flex items-center justify-center gap-2 text-white/50">
            <span>Starting at</span>
            <span className="text-2xl font-bold text-white">${YEARLY_MONTHLY}</span>
            <span>/month</span>
          </div>
        </div>
      </section>

      {/* Pricing Cards Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Billing toggle */}
          <div className="flex justify-center mb-10">
            <div className="flex gap-2 p-1.5 bg-white/5 rounded-xl border border-white/15">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`py-2.5 px-6 rounded-lg text-sm font-medium transition-all ${
                  billingPeriod === 'monthly'
                    ? 'bg-white/10 text-white'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`py-2.5 px-6 rounded-lg text-sm font-medium transition-all ${
                  billingPeriod === 'yearly'
                    ? 'bg-white/10 text-white'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Yearly
                <span className="ml-2 text-xs text-amber-400">Save {SAVINGS_PERCENT}%</span>
              </button>
            </div>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Free Plan */}
            <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/15">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">Free</h3>
                <p className="text-white/70 text-sm">Perfect for trying out Voxu</p>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold text-white">$0</span>
                <span className="text-white/50">/forever</span>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-white/70 text-sm">
                  <Check className="w-4 h-4 text-white/50 flex-shrink-0" />
                  <span>1 session per day</span>
                </li>
                <li className="flex items-center gap-3 text-white/70 text-sm">
                  <Check className="w-4 h-4 text-white/50 flex-shrink-0" />
                  <span>10-minute session limit</span>
                </li>
                <li className="flex items-center gap-3 text-white/70 text-sm">
                  <Check className="w-4 h-4 text-white/50 flex-shrink-0" />
                  <span>Daily rotation music</span>
                </li>
                <li className="flex items-center gap-3 text-white/40 text-sm">
                  <X className="w-4 h-4 flex-shrink-0" />
                  <span>Checkpoints</span>
                </li>
                <li className="flex items-center gap-3 text-white/40 text-sm">
                  <X className="w-4 h-4 flex-shrink-0" />
                  <span>Journal history</span>
                </li>
                <li className="flex items-center gap-3 text-white/40 text-sm">
                  <X className="w-4 h-4 flex-shrink-0" />
                  <span>Offline downloads</span>
                </li>
              </ul>

              <button
                onClick={() => router.push('/signup')}
                className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/15 text-white font-medium hover:bg-white/10 transition-colors"
              >
                Get Started
              </button>
            </div>

            {/* Premium Plan */}
            <div className="relative p-6 rounded-2xl bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/20">
              {/* Popular badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <div className="px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold">
                  Most Popular
                </div>
              </div>

              <div className="mb-6 pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <h3 className="text-xl font-semibold text-white">Premium</h3>
                </div>
                <p className="text-white/70 text-sm">The full Voxu experience</p>
              </div>

              <div className="mb-6">
                {billingPeriod === 'monthly' ? (
                  <>
                    <span className="text-3xl font-bold text-white">${MONTHLY_PRICE}</span>
                    <span className="text-white/50">/month</span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-white">${YEARLY_PRICE}</span>
                    <span className="text-white/50">/year</span>
                    <p className="text-amber-400/80 text-sm mt-1">
                      Just ${YEARLY_MONTHLY}/month
                    </p>
                  </>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-white/70 text-sm">
                  <div className="p-0.5 rounded bg-amber-500/20">
                    <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  </div>
                  <span>Unlimited daily sessions</span>
                </li>
                <li className="flex items-center gap-3 text-white/70 text-sm">
                  <div className="p-0.5 rounded bg-amber-500/20">
                    <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  </div>
                  <span>No time limits</span>
                </li>
                <li className="flex items-center gap-3 text-white/70 text-sm">
                  <div className="p-0.5 rounded bg-amber-500/20">
                    <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  </div>
                  <span>All 6 music genres</span>
                </li>
                <li className="flex items-center gap-3 text-white/70 text-sm">
                  <div className="p-0.5 rounded bg-amber-500/20">
                    <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  </div>
                  <span>All checkpoints & features</span>
                </li>
                <li className="flex items-center gap-3 text-white/70 text-sm">
                  <div className="p-0.5 rounded bg-amber-500/20">
                    <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  </div>
                  <span>Full journal history</span>
                </li>
                <li className="flex items-center gap-3 text-white/70 text-sm">
                  <div className="p-0.5 rounded bg-amber-500/20">
                    <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  </div>
                  <span>Offline downloads</span>
                </li>
              </ul>

              <button
                onClick={handleStartTrial}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Start 7-Day Free Trial</span>
                  </>
                )}
              </button>

              <p className="text-center text-white/50 text-xs mt-3">
                Cancel anytime. No commitment required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-16 px-4 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">
            Compare Plans
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/15">
                  <th className="text-left py-4 px-4 text-white/70 font-medium">Feature</th>
                  <th className="text-center py-4 px-4 text-white/70 font-medium w-32">Free</th>
                  <th className="text-center py-4 px-4 text-amber-400 font-medium w-32">
                    <div className="flex items-center justify-center gap-1">
                      <Crown className="w-4 h-4" />
                      Premium
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feature, index) => (
                  <tr key={index} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <feature.icon className="w-4 h-4 text-white/70" />
                        <span className="text-white/70 text-sm">{feature.name}</span>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      {typeof feature.free === 'boolean' ? (
                        feature.free ? (
                          <Check className="w-4 h-4 text-green-400 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-white/40 mx-auto" />
                        )
                      ) : (
                        <span className="text-white/50 text-sm">{feature.free}</span>
                      )}
                    </td>
                    <td className="text-center py-4 px-4">
                      {typeof feature.premium === 'boolean' ? (
                        feature.premium ? (
                          <Check className="w-4 h-4 text-amber-400 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-white/40 mx-auto" />
                        )
                      ) : (
                        <span className="text-amber-400/80 text-sm font-medium">{feature.premium}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 border-t border-white/5">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">
            Frequently Asked Questions
          </h2>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, index) => (
              <div
                key={index}
                className="rounded-xl bg-white/[0.02] border border-white/15 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <span className="text-white font-medium">{item.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-white/50 transition-transform ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-4 pb-4">
                    <p className="text-white/70 text-sm leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Indicators & CTA */}
      <section className="py-16 px-4 border-t border-white/5">
        <div className="max-w-xl mx-auto text-center">
          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="flex items-center gap-2 text-white/50 text-sm">
              <Shield className="w-4 h-4" />
              <span>Secure checkout</span>
            </div>
            <div className="flex items-center gap-2 text-white/50 text-sm">
              <CreditCard className="w-4 h-4" />
              <span>Powered by Stripe</span>
            </div>
          </div>

          <h3 className="text-2xl font-bold text-white mb-4">
            Ready to upgrade your focus?
          </h3>
          <p className="text-white/70 mb-8">
            Join thousands of users who have transformed their productivity with Voxu Premium.
          </p>

          <button
            onClick={handleStartTrial}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 py-4 px-8 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-lg hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading...</span>
              </>
            ) : (
              <>
                <Crown className="w-5 h-5" />
                <span>Start Your Free Trial</span>
              </>
            )}
          </button>
          <p className="text-white/50 text-sm mt-3">
            7-day free trial. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/5">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-white/50 text-sm">
          <span>Voxu {new Date().getFullYear()}</span>
          <div className="flex items-center gap-6">
            <a href="/terms" className="hover:text-white/70 transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-white/70 transition-colors">Privacy</a>
            <a href="mailto:support@voxu.app" className="hover:text-white/70 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
