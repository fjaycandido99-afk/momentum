'use client'

import { useState, useEffect } from 'react'
import { isNativeApp } from '@/lib/native'
import { APP_STORE_URL } from '@/components/marketing/JoinCta'
import type { UpgradeReason } from '@/contexts/SubscriptionContext'
import Link from 'next/link'
import { X, Crown, Sparkles, Zap, Book, Loader2, MessageCircle, Mic, BarChart3, Headphones, Brain, AudioLines, Lock } from 'lucide-react'
import { SpeakingRing } from '@/components/voice-guide/SpeakingRing'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { getProducts, purchaseProduct, restorePurchases, REVENUECAT_PRODUCTS } from '@/lib/revenuecat'
import { listPrices, usd } from '@/lib/pricing'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const
/** The paywall's warm gold (Francis's 'Golden Mountain Night' design). */
const GOLD = '#E9C9A0'
import { TRIAL_DAYS } from '@/lib/subscription-constants'
import { ScrollLock } from '@/components/ui/ScrollLock'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  /** What they reached for; the screen leads with it. */
  reason?: UpgradeReason | null
}

/**
 * What premium actually buys.
 *
 * Four of the six that used to be here were not premium at all: unlimited
 * sessions and no time limits are free (FREE_TIER_LIMITS is 99/999),
 * checkpoints are free (`checkpoints_enabled: true`), voice TONES are not
 * gated anywhere, and offline downloads are not a feature that exists —
 * `offline_enabled` is declared in lib/subscription-constants.ts and read by
 * nothing. Selling someone a list of things they already have is how a
 * paywall teaches people to distrust the app.
 *
 * Every line below maps to a gate: FREE_CALLBACK_DAYS, AI_FEATURE_LIMITS
 * (chat, chat_voice), AI_MEMORY_DEPTH, the voiceGuides free ids, the journal
 * and progress windows, and the Era Recap check in lib/era/service.ts.
 */
const PREMIUM_BENEFITS: { key: string; icon: typeof Book; title: string; line: string }[] = [
  { key: 'talk', icon: MessageCircle, title: 'Unlimited conversations', line: 'Talk with Voxu as much as you like — free has 20 a week.' },
  { key: 'voice', icon: Mic, title: 'Voxu’s voice', line: '30 spoken replies a day — free has 7 a week.' },
  { key: 'experiments', icon: BarChart3, title: 'Your laws, tested', line: '7-day experiments, and the charts behind your patterns.' },
  { key: 'lesson', icon: Book, title: 'The full psychology library', line: 'All 15 lessons — free has 4.' },
  { key: 'audio', icon: Headphones, title: 'Every guided session', line: 'The whole library — free has a starter four.' },
  { key: 'memory', icon: Sparkles, title: 'A coach that remembers', line: 'Voxu reads your last 30 days — and day one.' },
  { key: 'recap', icon: Crown, title: 'The Era Recap', line: 'A letter at day 30, and a year of progress.' },
  { key: 'widget', icon: Zap, title: 'Premium widgets', line: 'Guided and Voxu-noticed, on your home screen.' },
]

/** What they reached for, said back to them first. Every line is a real gate. */
const REASON_HEADLINE: Record<UpgradeReason, { title: string; line: string }> = {
  experiments: { title: 'Test what actually works for you', line: 'Change one thing for 7 days, compared with your own last four weeks.' },
  charts: { title: 'See your rhythm', line: 'When you keep your promises, and what gets in the way — from your own record.' },
  lesson: { title: 'The whole library', line: 'Every lesson, its loop, something to try, and the study behind it.' },
  voice: { title: 'Hear Voxu', line: 'Your spoken replies are used up for now. Premium gives you 30 a day.' },
  talk: { title: 'Keep talking with Voxu', line: 'Premium gives you unlimited coaching conversations — and a Voxu that reads your last 30 days.' },
  memory: { title: 'Let Voxu learn how you work', line: 'Voxu reads your last 30 days — journal, promises, check-ins — and notices what keeps coming up.' },
  audio: { title: 'Unlock every guided session', line: 'The whole library of guided audio, in Voxu’s voice — not just the starter four.' },
  widget: { title: 'Voxu on your home screen', line: 'Play today’s guided session and see what your record shows, from a widget.' },
}

export function UpgradeModal({ isOpen, onClose, reason = null }: UpgradeModalProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly')
  const [isLoading, setIsLoading] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  /** Apple's own price strings for this person's country (native only). */
  const [store, setStore] = useState<{ monthly: string; yearly: string; yearlyPerMonth: string | null } | null>(null)
  const { refreshSubscription } = useSubscription()

  const isNative = isNativeApp()
  // Web checkout needs Stripe in production. Until its keys are added, the
  // web says where Premium is sold (the iPhone app) instead of a checkout that
  // fails. Adding NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (and the server keys)
  // brings card checkout back with the next deploy.
  const webCheckout = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // In the app: show exactly what Apple will charge, in their currency.
  useEffect(() => {
    if (!isOpen || !isNative) return
    let live = true
    getProducts().then(ps => {
      if (!live) return
      const m = ps.find(p => p.identifier === REVENUECAT_PRODUCTS.premium_monthly)
      const y = ps.find(p => p.identifier === REVENUECAT_PRODUCTS.premium_yearly)
      if (!m || !y) return
      let perMonth: string | null = null
      try { if (y.currencyCode) perMonth = new Intl.NumberFormat(undefined, { style: 'currency', currency: y.currencyCode }).format(y.price / 12) } catch { /* show without it */ }
      setStore({ monthly: m.priceString, yearly: y.priceString, yearlyPerMonth: perMonth })
    }).catch(() => {})
    return () => { live = false }
  }, [isOpen, isNative])

  if (!isOpen) return null

  const list = listPrices()
  const monthlyLabel = store?.monthly ?? usd(list.monthly)
  const yearlyLabel = store?.yearly ?? usd(list.yearly)
  const yearlyPerMonthLabel = store ? store.yearlyPerMonth : `$${list.yearlyPerMonth}`

  /**
   * After Apple says yes, RevenueCat tells our server a moment later
   * (the webhook). Wait for it — a few short checks — so the screen they
   * land on already shows Premium instead of the free limits.
   */
  const waitForPremium = async () => {
    for (let i = 0; i < 6; i++) {
      await refreshSubscription()
      const r = await fetch('/api/subscription', { cache: 'no-store' }).then(x => (x.ok ? x.json() : null)).catch(() => null)
      if (r?.isPremium || r?.tier === 'premium') return true
      await new Promise(res => setTimeout(res, 2000))
    }
    return false
  }

  const handleUpgrade = async () => {
    setIsLoading(true)
    setError(null)
    setNote(null)
    try {
      if (isNative) {
        const productId = billingPeriod === 'yearly' ? REVENUECAT_PRODUCTS.premium_yearly : REVENUECAT_PRODUCTS.premium_monthly
        const success = await purchaseProduct(productId)
        if (success) {
          setNote('You’re in. Setting up Premium…')
          const ok = await waitForPremium()
          if (ok) onClose()
          else setNote('Apple confirmed it. Premium can take a minute to appear — it will, without paying again.')
        }
      } else {
        const response = await fetch('/api/stripe/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceType: billingPeriod }),
        })
        const data = await response.json()
        if (data.url) window.location.href = data.url
        else setError('Couldn’t open checkout. Try again in a moment.')
      }
    } catch (err: any) {
      console.error('Failed to purchase:', err)
      setError(err?.message || 'Purchase failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestore = async () => {
    setRestoring(true)
    setError(null)
    setNote(null)
    try {
      const active = await restorePurchases()
      if (!active) { setNote('No Premium subscription found on this Apple ID.'); return }
      setNote('Found it. Restoring Premium…')
      if (await waitForPremium()) onClose()
      else setNote('Restored with Apple. Premium can take a minute to appear here.')
    } catch {
      setError('Couldn’t restore just now. Try again in a moment.')
    } finally {
      setRestoring(false)
    }
  }

  const sorted = [...PREMIUM_BENEFITS].sort((a, b) => Number(b.key === reason) - Number(a.key === reason))
  const benefits = showAll ? sorted : sorted.slice(0, 6)
  const subtitle = reason ? REASON_HEADLINE[reason].title : 'Let Voxu learn how you work.'
  const line = reason ? REASON_HEADLINE[reason].line : 'Deeper conversations, Voxu’s voice, every guided session, and the patterns in your own record.'

  const plan = (key: 'yearly' | 'monthly') => {
    const on = billingPeriod === key
    return (
      <button
        type="button"
        role="radio"
        aria-checked={on}
        onClick={() => setBillingPeriod(key)}
        className="relative flex-1 min-w-0 text-left rounded-2xl px-3.5 pt-3.5 pb-3 transition-all"
        style={{
          border: `1px solid ${on ? GOLD : 'rgba(255,255,255,0.14)'}`,
          background: on ? 'rgba(233,201,160,0.08)' : 'rgba(255,255,255,0.03)',
          boxShadow: on ? '0 0 24px rgba(233,201,160,0.18)' : 'none',
        }}
      >
        <span className="flex items-start justify-between gap-2">
          <span className="w-5 h-5 rounded-full border flex items-center justify-center" style={{ borderColor: on ? GOLD : 'rgba(255,255,255,0.4)' }} aria-hidden>
            {on && <span className="w-2.5 h-2.5 rounded-full" style={{ background: GOLD }} />}
          </span>
          {key === 'yearly' && (
            <span className="px-2 py-0.5 rounded-full text-px-10 font-semibold text-black" style={{ background: GOLD }}>Best value</span>
          )}
        </span>
        <span className="block mt-2 text-px-15 text-white" style={SERIF}>{key === 'yearly' ? 'Yearly' : 'Monthly'}</span>
        <span className="block text-px-22 text-white leading-tight tabular-nums" style={SERIF}>
          {key === 'yearly' ? yearlyLabel : monthlyLabel}<span className="text-px-12 text-white/60"> / {key === 'yearly' ? 'year' : 'month'}</span>
        </span>
        <span className="block mt-1 text-px-11 leading-snug" style={{ color: key === 'yearly' ? GOLD : 'rgba(255,255,255,0.6)' }}>
          {key === 'yearly'
            ? `Save ${list.yearlySave}%${yearlyPerMonthLabel ? ` · ${yearlyPerMonthLabel}/month` : ''}`
            : 'Flexible, cancel anytime'}
        </span>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-stretch md:items-center justify-center md:p-6" role="dialog" aria-modal="true" aria-label="Voxu Premium">
      <ScrollLock />
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full md:max-w-md h-[100dvh] md:h-auto md:max-h-[92dvh] overflow-y-auto overflow-x-hidden overscroll-contain bg-black md:rounded-3xl md:border md:border-white/15">
        {/* A warm night: the paywall's own scene if it exists, else the opener's. */}
        <SceneBackdrop />

        <div className="relative px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}>
          <div className="flex items-center justify-between">
            <span className="text-px-28 text-white" style={{ ...SERIF, fontWeight: 600 }}>Voxu</span>
            <button onClick={onClose} aria-label="Close" className="tap-44 p-2.5 rounded-full bg-black/45 border border-white/15">
              <X className="w-5 h-5 text-white/90" />
            </button>
          </div>

          {/* Voxu's own dial, glowing gold-white, breathing. */}
          <div className="relative mx-auto mt-2 w-28 h-28">
            <SpeakingRing always size={150} glow="233 201 160" />
          </div>

          <h2 className="mt-3 text-center text-px-34 leading-[1.05]" style={{ ...SERIF, fontWeight: 600, color: '#F3E2C7' }}>Unlock Voxu Premium</h2>
          <p className="mt-1.5 text-center text-px-18 text-white/90" style={SERIF}>{subtitle}</p>
          <p className="mt-2 text-center text-px-14 text-white/70 leading-snug">{line}</p>
          <p className="mt-3 flex items-center justify-center gap-3 text-px-12 text-white/75">
            <span className="inline-flex items-center gap-1"><Brain className="w-3.5 h-3.5" style={{ color: GOLD }} aria-hidden /> Personal</span>
            <span className="text-white/30">•</span>
            <span className="inline-flex items-center gap-1"><AudioLines className="w-3.5 h-3.5" style={{ color: GOLD }} aria-hidden /> Adaptive</span>
            <span className="text-white/30">•</span>
            <span className="inline-flex items-center gap-1"><Lock className="w-3.5 h-3.5" style={{ color: GOLD }} aria-hidden /> Private</span>
          </p>

          <ul className="mt-5 space-y-2">
            {benefits.map(b => (
              <li key={b.key} className={`flex items-center gap-3.5 rounded-2xl px-4 py-3 border ${b.key === reason ? 'border-white/40 bg-white/[0.08]' : 'border-white/[0.1] bg-black/40'}`}>
                <b.icon className="w-5 h-5 shrink-0 text-white/85" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-px-15 text-white leading-snug" style={SERIF}>{b.title}</span>
                  <span className="block text-px-12 text-white/60 leading-snug">{b.line}</span>
                </span>
              </li>
            ))}
          </ul>
          {!showAll && sorted.length > benefits.length && (
            <button onClick={() => setShowAll(true)} className="tap-44 mt-1 w-full text-center text-px-13 text-white/60 underline underline-offset-4">
              And {sorted.length - benefits.length} more
            </button>
          )}

          <div className="mt-5 flex gap-2.5" role="radiogroup" aria-label="Plan">
            {plan('monthly')}
            {plan('yearly')}
          </div>

          {!isNative && !webCheckout ? (
            <a href={APP_STORE_URL} className="tap-44 mt-5 w-full py-4 rounded-full text-black text-px-18 font-semibold flex items-center justify-center press-scale" style={{ ...SERIF, background: `linear-gradient(180deg, #F2D9B3, ${GOLD} 55%, #C9A574)` }}>
              Get Voxu on the App Store
            </a>
          ) : (
            <button
              onClick={handleUpgrade}
              disabled={isLoading || restoring}
              aria-busy={isLoading}
              className="tap-44 mt-5 w-full py-4 rounded-full text-black text-px-19 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 press-scale"
              style={{ ...SERIF, background: `linear-gradient(180deg, #F2D9B3, ${GOLD} 55%, #C9A574)`, boxShadow: '0 8px 28px rgba(233,201,160,0.25)' }}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {isLoading ? 'One moment…' : 'Start Free Trial'}
            </button>
          )}
          <p className="mt-2 text-center text-px-12 text-white/65">
            {TRIAL_DAYS}-day free trial, then {billingPeriod === 'yearly' ? `${yearlyLabel} a year` : `${monthlyLabel} a month`}. Cancel anytime.
          </p>
          {note && <p className="mt-3 text-center text-px-13 text-white/85" role="status">{note}</p>}
          {error && <p className="mt-3 text-center text-px-13 text-white/85" role="alert">{error}</p>}

          <div className="mt-4 text-center">
            <button onClick={onClose} className="tap-44 text-px-16 text-white/80 underline underline-offset-4" style={SERIF}>Continue with Free</button>
          </div>
          {isNative && (
            <div className="mt-1 text-center">
              <button onClick={handleRestore} disabled={restoring || isLoading} className="tap-44 text-px-12 text-white/55 underline underline-offset-4 disabled:opacity-50">
                {restoring ? 'Restoring…' : 'Restore purchases'}
              </button>
            </div>
          )}

          <p className="mt-4 text-center text-white/40 text-px-11 leading-relaxed">
            Payment is charged to your {isNative ? 'Apple ID' : 'payment method'} when the trial ends. The subscription renews automatically unless cancelled at least 24 hours before the end of the current period. {isNative ? 'Manage or cancel in Settings › Apple ID › Subscriptions.' : 'Cancel anytime from your account settings.'}
          </p>
          <div className="mt-2 flex items-center justify-center gap-3 text-white/45 text-px-11">
            <Link href="/terms" onClick={onClose} className="underline">Terms of Use</Link>
            <span className="text-white/20">·</span>
            <Link href="/privacy" onClick={onClose} className="underline">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * The paywall's scene: /scenes/premium/backdrop.jpg (the warm cabin window
 * over a night lake, from the design) when it exists, else the opener's
 * night — faded into black so the words always read.
 */
function SceneBackdrop() {
  const [src, setSrc] = useState('/scenes/premium/backdrop.jpg')
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        onError={() => setSrc(s => (s.endsWith('night-tall.jpg') ? s : '/scenes/home/night-tall.jpg'))}
        alt=""
        aria-hidden
        className="absolute inset-x-0 top-0 h-[60%] w-full object-cover opacity-90 pointer-events-none"
      />
      <div className="absolute inset-x-0 top-0 h-[60%] bg-gradient-to-b from-black/0 via-black/25 to-black pointer-events-none" aria-hidden />
    </>
  )
}

// Wrapper component that uses context
export function UpgradeModalWithContext() {
  const { showUpgradeModal, closeUpgradeModal, upgradeReason } = useSubscription()
  return <UpgradeModal isOpen={showUpgradeModal} onClose={closeUpgradeModal} reason={upgradeReason} />
}
