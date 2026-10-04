'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  Accessibility, Bell, BookOpen, Brain, CalendarDays, ChevronRight, CreditCard, Globe, HelpCircle,
  Info, LayoutGrid, Lock, Mountain, Sparkles, SunMedium, User,
  type LucideIcon,
} from 'lucide-react'
import { isNativeApp } from '@/lib/native'
import { GOLD, GOLD_GRADIENT, SERIF } from '@/components/premium/offer'
import { WidgetGuideSheet } from '@/components/widget/WidgetGuideSheet'

/** Apple's own page for managing App Store subscriptions. */
const APPLE_SUBSCRIPTIONS = 'https://apps.apple.com/account/subscriptions'

interface RowProps {
  icon: LucideIcon
  title: string
  sub?: string
  /** Right-hand summary, e.g. "Free plan". */
  value?: string
  href?: string
  onClick?: () => void
}

function Row({ icon: Icon, title, sub, value, href, onClick }: RowProps) {
  const inner = (
    <>
      <Icon className="w-5 h-5 shrink-0 text-white/70" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-px-15 text-white leading-snug">{title}</span>
        {sub && <span className="block text-px-12 text-white/55 leading-snug truncate">{sub}</span>}
      </span>
      {value && <span className="shrink-0 text-px-12 text-white/50 text-right max-w-[45%] truncate">{value}</span>}
      <ChevronRight className="w-4 h-4 shrink-0 text-white/35" aria-hidden />
    </>
  )
  const cls = 'w-full flex items-center gap-3.5 px-4 py-3.5 text-left active:bg-white/[0.04] transition-colors'
  if (href) {
    const external = href.startsWith('http')
    return external
      ? <a href={href} className={cls}>{inner}</a>
      : <Link href={href} className={cls}>{inner}</Link>
  }
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <p className="px-1 text-px-11 tracking-[0.22em] uppercase text-white/45">{label}</p>
      <div className="mt-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] divide-y divide-white/[0.06] overflow-hidden">
        {children}
      </div>
    </section>
  )
}

/**
 * Settings, as an index — grouped rows, small icons, a one-line summary,
 * thin dividers (Francis's design). Each row opens its own page
 * (/settings?s=<id>) with that section's controls. Only Premium gets a card.
 */
export function SettingsIndex({ isPremium, isTrialing, onUpgrade, rhythm, name, notificationsSummary }: {
  isPremium: boolean
  isTrialing: boolean
  onUpgrade: () => void
  /** "Professional · Mon–Fri · 9:00 AM–5:00 PM" */
  rhythm: string
  name: string | null
  notificationsSummary?: string
}) {
  const [inApp, setInApp] = useState(false)
  const [widgetGuide, setWidgetGuide] = useState(false)
  useEffect(() => { setInApp(isNativeApp()) }, [])

  const s = (id: string) => `/settings?s=${id}`

  return (
    <div className="pb-6">
      {/* Premium — the one card on this screen. */}
      {isPremium ? (
        <div className="rounded-2xl p-4 border" style={{ borderColor: 'rgba(233,201,160,0.35)', background: 'linear-gradient(135deg, rgba(233,201,160,0.10), rgba(255,255,255,0.02))' }}>
          <p className="text-px-11 tracking-[0.24em] uppercase" style={{ color: GOLD }}>Voxu Premium</p>
          <p className="mt-1 text-px-22 text-white" style={{ ...SERIF, fontWeight: 600 }}>{isTrialing ? 'Your free trial is on.' : 'You have everything.'}</p>
          <p className="mt-1 text-px-13 text-white/65">The coach, the voice, every session and everything your record can teach you.</p>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border" style={{ borderColor: 'rgba(233,201,160,0.3)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/scenes/home/night-wide.jpg" alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/20" aria-hidden />
          <div className="relative p-4">
            <p className="text-px-11 tracking-[0.24em] uppercase" style={{ color: GOLD }}>Voxu Premium</p>
            <p className="mt-1 text-px-24 text-white leading-tight" style={{ ...SERIF, fontWeight: 600 }}>Go deeper with Voxu.</p>
            <p className="mt-1.5 text-px-13 text-white/75 leading-snug max-w-[85%]">Unlimited conversations, Voxu&rsquo;s voice, every guided session, and your laws, tested.</p>
            <div className="mt-3.5 flex gap-2">
              <button onClick={onUpgrade} className="tap-44 flex-1 py-2.5 rounded-full text-black text-px-14 font-semibold" style={{ ...SERIF, background: GOLD_GRADIENT }}>
                View plans
              </button>
              <Link
                href="/pricing"
                onClick={e => { if (isNativeApp()) { e.preventDefault(); onUpgrade() } }}
                className="tap-44 flex-1 py-2.5 rounded-full border border-white/25 text-px-14 text-white text-center"
              >
                Compare features
              </Link>
            </div>
          </div>
        </div>
      )}

      <Group label="You">
        <Row icon={User} title="Profile & Account" sub={name ? `${name} · name, plan, sign in` : 'Your name, plan, sign in'} href={s('account')} />
        <Row icon={Brain} title="Voxu Memory" sub="What Voxu can remember about you" href={s('ai-memory')} />
      </Group>

      <Group label="Your experience">
        <Row icon={CalendarDays} title="Daily Rhythm" sub={rhythm} href={s('profile-schedule')} />
        <Row icon={SunMedium} title="Daily Experience" sub="Segments, voice tone, what Home shows" href={s('daily-experience')} />
        <Row icon={Sparkles} title="Mindset & Coaching" sub="The philosophy Voxu coaches you with" href={s('mindset')} />
        <Row icon={Mountain} title="Era & Growth" sub="Your era, your proof, your eras in order" href={s('growth')} />
      </Group>

      <Group label="Voxu">
        <Row icon={BookOpen} title="Patterns & Psychology" sub="Your laws, experiments and lessons" href={s('patterns')} />
        <Row icon={Bell} title="Notifications" sub={notificationsSummary ?? 'Reminders, check-ins and how often Voxu nudges'} href={s('notifications')} />
        {inApp && <Row icon={LayoutGrid} title="Home Screen Widgets" sub="Today's promise on your home screen" onClick={() => setWidgetGuide(true)} />}
        <Row icon={Accessibility} title="Accessibility" sub="Follows your iPhone's settings" href={s('accessibility')} />
        <Row icon={Globe} title="Language" href={s('language')} />
      </Group>

      <Group label="Account">
        <Row icon={Lock} title="Privacy & Data" sub="Your data, permissions and export" href={s('privacy')} />
        <Row
          icon={CreditCard}
          title="Manage Subscription"
          value={isPremium ? (isTrialing ? 'Free trial' : 'Premium') : 'Free plan'}
          {...(isPremium
            ? (inApp ? { href: APPLE_SUBSCRIPTIONS } : { href: s('account') })
            : { onClick: onUpgrade })}
        />
        <Row icon={HelpCircle} title="Help & Support" href={s('help')} />
        <Row icon={Info} title="About Voxu" href={s('help')} />
      </Group>

      {widgetGuide && <WidgetGuideSheet onClose={() => setWidgetGuide(false)} />}
    </div>
  )
}
