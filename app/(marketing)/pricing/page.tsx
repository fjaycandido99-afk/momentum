'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AudioLines, Book, Brain, Check, ChevronDown, Clock, Crown, Loader2, Lock, Music, Sparkles, X, Zap } from 'lucide-react'
import { isNativeApp } from '@/lib/native'
import { listPrices, usd } from '@/lib/pricing'
import { TRIAL_DAYS } from '@/lib/subscription-constants'
import { APP_STORE_URL } from '@/components/marketing/JoinCta'
import { SpeakingRing } from '@/components/voice-guide/SpeakingRing'
import { GOLD, GOLD_GRADIENT, PREMIUM_BENEFITS, SERIF } from '@/components/premium/offer'

/**
 * /pricing — Francis's "Golden Mountain Night" design, the same as the
 * in-app upgrade screen (components/premium/UpgradeModal): the night scene,
 * Voxu's dial in gold, the benefit cards, side-by-side plans, the gold
 * button. Below it, the full comparison and the questions.
 *
 * Buying: in the app → the app's own Apple purchase screen; on the web →
 * Stripe checkout when its keys exist, otherwise the App Store.
 */
/**
 * The comparison table.
 *
 * EVERY ROW HERE MUST BE ENFORCED SOMEWHERE IN THE CODE. That is not a
 * style note — this table was advertising two features that do not exist
 * ("Offline downloads", "All backgrounds": `offline_enabled` and
 * `voiceTones` are declared in lib/subscription-constants.ts and read by
 * nothing, and there is no download UI in the app), and marking journal
 * history as a flat ✗ for free when the code gives free users seven days
 * of it, server-enforced.
 *
 * So: the free column is FREE_TIER_LIMITS and AI_FEATURE_LIMITS[x].free,
 * the premium column is what the gate actually lifts, and nothing appears
 * in either that a reader could not go and verify in the app.
 */
const FEATURES = [
  {
    name: 'Your era, promises & missions',
    free: 'Everything',
    premium: 'Everything',
    icon: Zap,
  },
  {
    name: 'Disciplines, practice & your year in proof',
    free: 'Everything',
    premium: 'Everything',
    icon: Sparkles,
  },
  {
    name: 'Daily sessions',
    free: 'Unlimited',
    premium: 'Unlimited',
    icon: Clock,
  },
  {
    name: 'Music, motivation & soundscapes',
    free: true,
    premium: true,
    icon: Music,
  },
  {
    name: 'Coaching conversations',
    free: '20 a week',
    premium: 'Unlimited',
    icon: Sparkles,
  },
  {
    name: 'Spoken replies',
    free: '7 a week',
    premium: '30 a day',
    icon: Sparkles,
  },
  {
    // AI_FEATURE_LIMITS.book_summary. This page's own comment says it MUST
    // track that record, and book summaries shipped without being added —
    // a metered feature nobody buying the plan could see they were getting.
    name: 'What a book has to do with your era',
    free: '1 a day',
    premium: 'Unlimited',
    icon: Book,
  },
  {
    name: 'Your coach remembering day one',
    free: 'Day 1 & day 7',
    premium: 'Every callback day',
    icon: Book,
  },
  {
    name: 'What the AI can read',
    free: 'Today',
    premium: 'Your last 30 days',
    icon: Book,
  },
  {
    name: 'Guided voice sessions',
    free: 'Morning Prime, Breathing, Focus, Gratitude & Sleep',
    premium: 'All of them',
    icon: Music,
  },
  {
    name: 'Journal history',
    free: 'Everything you’ve written',
    premium: 'Everything you’ve written',
    icon: Book,
  },
  {
    name: 'Progress history',
    free: 'Last 7 days',
    premium: 'A full year',
    icon: Clock,
  },
  {
    name: 'The Era Recap at day 30',
    free: false,
    premium: true,
    icon: Book,
  },
  {
    name: 'Goals & the weekly AI summary',
    free: false,
    premium: true,
    icon: Sparkles,
  },
  {
    name: 'Psychology lessons',
    free: '4 (one per group)',
    premium: 'All 15',
    icon: Book,
  },
  {
    name: '7-day experiments',
    free: 'Your first one',
    premium: 'Unlimited',
    icon: Zap,
  },
  {
    name: 'Your rhythm & what gets in the way',
    free: false,
    premium: true,
    icon: Clock,
  },
  {
    name: 'Home-screen widgets',
    free: 'Today & Quote',
    premium: '+ Guided & Noticed',
    icon: Sparkles,
  },
]


const FAQ_ITEMS = [
  {
    question: 'What happens after my free trial?',
    answer: `After your ${TRIAL_DAYS}-day free trial, your plan starts automatically — monthly or yearly, whichever you chose. Cancel before the trial ends and you won't be charged.`,
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes. Cancel whenever you like; Premium stays until the end of the period you paid for, and everything you made in Voxu stays yours.',
  },
  {
    question: 'How do I pay?',
    answer: 'Through the App Store, in the Voxu app on your iPhone — it uses the payment method on your Apple ID. You can manage or cancel it in Settings › Apple ID › Subscriptions.',
  },
  {
    question: 'What stays free?',
    answer: 'Your era, your daily promises, missions, your whole journal, your laws, your year of proof and every era you finish — free, forever. Premium adds the coach, the voice and the depth.',
  },
  {
    question: 'Can I switch between monthly and yearly?',
    answer: 'Yes — in Settings › Apple ID › Subscriptions. The change takes effect at your next renewal.',
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly')
  const [isLoading, setIsLoading] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [inApp, setInApp] = useState(false)
  useEffect(() => { setInApp(isNativeApp()) }, [])
  const list = listPrices()
  const webCheckout = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

  const start = async () => {
    // In the app, Premium is bought through Apple only — its own screen.
    if (inApp) { window.location.href = '/?upgrade=1'; return }
    if (!webCheckout) { window.location.href = APP_STORE_URL; return }
    setIsLoading(true)
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceType: billingPeriod }),
      })
      const data = await response.json()
      if (data.url) window.location.href = data.url
      else if (data.error === 'Not authenticated') router.push('/signup?redirect=/pricing')
    } catch (error) {
      console.error('Failed to create checkout:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const benefits = showAll ? PREMIUM_BENEFITS : PREMIUM_BENEFITS.slice(0, 6)

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
          {key === 'yearly' && <span className="px-2 py-0.5 rounded-full text-px-10 font-semibold text-black" style={{ background: GOLD }}>Best value</span>}
        </span>
        <span className="block mt-2 text-px-15 text-white" style={SERIF}>{key === 'yearly' ? 'Yearly' : 'Monthly'}</span>
        <span className="block text-px-22 text-white leading-tight tabular-nums" style={SERIF}>
          {usd(key === 'yearly' ? list.yearly : list.monthly)}<span className="text-px-12 text-white/60"> / {key === 'yearly' ? 'year' : 'month'}</span>
        </span>
        <span className="block mt-1 text-px-11 leading-snug" style={{ color: key === 'yearly' ? GOLD : 'rgba(255,255,255,0.6)' }}>
          {key === 'yearly' ? `Save ${list.yearlySave}% · $${list.yearlyPerMonth}/month` : 'Flexible, cancel anytime'}
        </span>
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* The offer — the mockup, top to bottom. */}
      <section className="relative overflow-hidden">
        <PremiumScene />
        <div className="relative max-w-md mx-auto px-5 pt-6 pb-10">
          {/* The site header already says Voxu — no second wordmark here. */}
          <div className="relative mx-auto mt-4 w-28 h-28">
            <SpeakingRing always size={150} glow="233 201 160" />
          </div>

          <h1 className="mt-3 text-center text-px-38 leading-[1.05]" style={{ ...SERIF, fontWeight: 600, color: '#F3E2C7' }}>Unlock Voxu Premium</h1>
          <p className="mt-1.5 text-center text-px-19 text-white/90" style={SERIF}>Let Voxu learn how you work.</p>
          <p className="mt-2 text-center text-px-14 text-white/70 leading-snug">
            Free helps you show up — your era, your promises and your record are free, forever. Premium is the coach, the voice, and everything your record can teach you.
          </p>
          <p className="mt-3 flex items-center justify-center gap-3 text-px-12 text-white/75">
            <span className="inline-flex items-center gap-1"><Brain className="w-3.5 h-3.5" style={{ color: GOLD }} aria-hidden /> Personal</span>
            <span className="text-white/30">•</span>
            <span className="inline-flex items-center gap-1"><AudioLines className="w-3.5 h-3.5" style={{ color: GOLD }} aria-hidden /> Adaptive</span>
            <span className="text-white/30">•</span>
            <span className="inline-flex items-center gap-1"><Lock className="w-3.5 h-3.5" style={{ color: GOLD }} aria-hidden /> Private</span>
          </p>

          <ul className="mt-5 space-y-2">
            {benefits.map(b => (
              <li key={b.key} className="flex items-center gap-3.5 rounded-2xl px-4 py-3 border border-white/[0.1] bg-black/40">
                <b.icon className="w-5 h-5 shrink-0 text-white/85" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-px-15 text-white leading-snug" style={SERIF}>{b.title}</span>
                  <span className="block text-px-12 text-white/60 leading-snug">{b.line}</span>
                </span>
              </li>
            ))}
          </ul>
          {!showAll && PREMIUM_BENEFITS.length > benefits.length && (
            <button onClick={() => setShowAll(true)} className="tap-44 mt-1 w-full text-center text-px-13 text-white/60 underline underline-offset-4">
              And {PREMIUM_BENEFITS.length - benefits.length} more
            </button>
          )}

          <div className="mt-5 flex gap-2.5" role="radiogroup" aria-label="Plan">
            {plan('monthly')}
            {plan('yearly')}
          </div>

          <button
            onClick={start}
            disabled={isLoading}
            className="tap-44 mt-5 w-full py-4 rounded-full text-black text-px-19 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 press-scale"
            style={{ ...SERIF, background: GOLD_GRADIENT, boxShadow: '0 8px 28px rgba(233,201,160,0.25)' }}
          >
            {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
            {!inApp && !webCheckout ? 'Get Voxu on the App Store' : 'Start Free Trial'}
          </button>
          <p className="mt-2 text-center text-px-12 text-white/65">
            {TRIAL_DAYS}-day free trial, then {billingPeriod === 'yearly' ? `${usd(list.yearly)} a year` : `${usd(list.monthly)} a month`}. Cancel anytime.
          </p>
          <div className="mt-4 text-center">
            <Link href={inApp ? '/' : '/signup'} className="tap-44 inline-block text-px-16 text-white/80 underline underline-offset-4" style={SERIF}>Continue with Free</Link>
          </div>
        </div>
      </section>

      {/* Free and Premium, side by side — every row is enforced in the code. */}
      <section className="px-5 py-12 border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-center text-px-28" style={{ ...SERIF, fontWeight: 600 }}>Free and Premium</h2>
          <div className="mt-6 rounded-2xl border border-white/[0.1] bg-white/[0.02] overflow-hidden">
            <div className="grid grid-cols-[1fr_6.5rem_6.5rem] px-4 py-3 text-px-12 border-b border-white/[0.08]">
              <span className="text-white/60">What you get</span>
              <span className="text-center text-white/60">Free</span>
              <span className="text-center font-medium inline-flex items-center justify-center gap-1" style={{ color: GOLD }}><Crown className="w-3.5 h-3.5" aria-hidden /> Premium</span>
            </div>
            {FEATURES.map(feature => (
              <div key={feature.name} className="grid grid-cols-[1fr_6.5rem_6.5rem] items-center px-4 py-3 border-b border-white/[0.05] last:border-b-0">
                <span className="flex items-center gap-2.5 min-w-0">
                  <feature.icon className="w-4 h-4 shrink-0 text-white/55" aria-hidden />
                  <span className="text-px-13 text-white/85 leading-snug">{feature.name}</span>
                </span>
                <span className="text-center text-px-12 text-white/60 leading-snug px-1">
                  {typeof feature.free === 'boolean'
                    ? (feature.free ? <Check className="w-4 h-4 mx-auto text-white/70" aria-label="Included" /> : <X className="w-4 h-4 mx-auto text-white/30" aria-label="Not included" />)
                    : feature.free}
                </span>
                <span className="text-center text-px-12 leading-snug px-1" style={{ color: GOLD }}>
                  {typeof feature.premium === 'boolean'
                    ? (feature.premium ? <Check className="w-4 h-4 mx-auto" aria-label="Included" /> : <X className="w-4 h-4 mx-auto text-white/30" aria-label="Not included" />)
                    : feature.premium}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-12 border-t border-white/[0.06]">
        <div className="max-w-xl mx-auto">
          <h2 className="text-center text-px-28" style={{ ...SERIF, fontWeight: 600 }}>Questions</h2>
          <div className="mt-6 space-y-2.5">
            {FAQ_ITEMS.map((item, index) => (
              <div key={item.question} className="rounded-2xl border border-white/[0.1] bg-white/[0.02] overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index} className="w-full flex items-center justify-between gap-3 p-4 text-left">
                  <span className="text-px-16 text-white" style={SERIF}>{item.question}</span>
                  <ChevronDown className={`w-5 h-5 shrink-0 text-white/50 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === index && <p className="px-4 pb-4 text-px-14 text-white/70 leading-relaxed">{item.answer}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 px-5 border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-px-13 text-white/50">
          <span>Voxu {new Date().getFullYear()}</span>
          <div className="flex items-center gap-6">
            <a href="/terms" className="hover:text-white/70">Terms</a>
            <a href="/privacy" className="hover:text-white/70">Privacy</a>
            <a href="mailto:support@voxu.app" className="hover:text-white/70">Support</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

/** The paywall's night (its own scene when it exists, else the opener's), fading into black. */
function PremiumScene() {
  // Start on the night that exists; swap in the paywall's own scene only
  // once it has actually loaded (a server-rendered <img> can 404 before
  // React is listening, and showed a broken-image box).
  const [src, setSrc] = useState('/scenes/home/night-tall.jpg')
  useEffect(() => {
    const probe = new Image()
    probe.onload = () => setSrc('/scenes/premium/backdrop.jpg')
    probe.src = '/scenes/premium/backdrop.jpg'
  }, [])
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute inset-x-0 top-0 h-[70%] w-full object-cover opacity-90 pointer-events-none"
      />
      <div className="absolute inset-x-0 top-0 h-[70%] bg-gradient-to-b from-black/0 via-black/25 to-black pointer-events-none" aria-hidden />
    </>
  )
}
