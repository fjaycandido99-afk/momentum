'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight, Download } from 'lucide-react'

/**
 * The Settings pages that gather what already lives elsewhere — links and
 * plain explanations, nothing invented. (The pages with controls are the
 * existing sections, rendered on their own: components/settings/
 * SettingsCategory reads the open page.)
 */
export const EXTRA_PAGES: Record<string, { title: string; sub: string }> = {
  growth: { title: 'Era & Growth', sub: 'Your era, your proof, and everything you’ve finished.' },
  patterns: { title: 'Patterns & Psychology', sub: 'What your record shows, what you test, and the lessons behind it.' },
  accessibility: { title: 'Accessibility', sub: 'Voxu follows your iPhone’s own settings.' },
  privacy: { title: 'Privacy & Data', sub: 'What Voxu keeps, what it may use, and how to take it with you.' },
  help: { title: 'Help & About', sub: 'Talk to a person, or read the fine print.' },
}

function LinkRow({ href, title, sub, external }: { href: string; title: string; sub?: string; external?: boolean }) {
  const inner = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-px-15 text-white leading-snug">{title}</span>
        {sub && <span className="block text-px-12 text-white/55 leading-snug">{sub}</span>}
      </span>
      <ChevronRight className="w-4 h-4 shrink-0 text-white/35" aria-hidden />
    </>
  )
  const cls = 'w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/[0.04]'
  return external ? <a href={href} className={cls}>{inner}</a> : <Link href={href} className={cls}>{inner}</Link>
}

function List({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      {label && <p className="px-1 text-px-11 tracking-[0.22em] uppercase text-white/45">{label}</p>}
      <div className="mt-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] divide-y divide-white/[0.06] overflow-hidden">{children}</div>
    </section>
  )
}

function Note({ children }: { children: ReactNode }) {
  return <p className="mt-2 px-1 text-px-12 text-white/50 leading-relaxed">{children}</p>
}

export function SettingsExtraPage({ section }: { section: string }) {
  switch (section) {
    case 'growth':
      return (
        <>
          <List>
            <LinkRow href="/era" title="Your era" sub="Today, your promise, the chapter you’re in" />
            <LinkRow href="/proof" title="Proof" sub="Every day you kept something, this year" />
            <LinkRow href="/eras" title="Your eras, in order" sub="Every era you’ve run, finished or stopped" />
            <LinkRow href="/photos" title="Progress photos" sub="Private to you" />
            <LinkRow href="/profile" title="Relics" sub="The coins you’ve earned, and the three you wear" />
          </List>
          <Note>Your history is yours and free, always — finished and stopped eras stay on the record.</Note>
        </>
      )
    case 'patterns':
      return (
        <>
          <List>
            <LinkRow href="/patterns" title="Your laws" sub="What your own record shows, with its counts" />
            <LinkRow href="/patterns?spot=laws-experiments" title="Experiments" sub="Change one thing for 7 days, against your last four weeks" />
            <LinkRow href="/psychology" title="Psychology library" sub="Short lessons, each resting on a real study" />
          </List>
          <List label="What Voxu may use">
            <LinkRow href="/settings?s=ai-memory" title="Voxu Memory" sub="Off unless you turn it on. Lets Voxu read back your recent journal and record" />
            <LinkRow href="/progress" title="Daily check-ins" sub="How you feel each day. Off unless you turn it on; then it can appear in your laws" />
          </List>
          <Note>Laws only appear once a difference in your own record passes a chance test. Voxu never reads your journal for patterns unless Voxu Memory is on.</Note>
        </>
      )
    case 'accessibility':
      return (
        <>
          <List label="From your iPhone">
            <div className="px-4 py-3.5">
              <p className="text-px-15 text-white">Text size, bold text, contrast, reduce motion</p>
              <p className="text-px-12 text-white/55 leading-snug">Voxu uses the ones you set in iPhone Settings › Accessibility — no separate switches to keep in sync.</p>
            </div>
          </List>
          <List label="In Voxu">
            <LinkRow href="/" title="Transcripts" sub="Every guided session has its words — tap Transcript in the player" />
            <LinkRow href="/settings?s=daily-experience" title="Voice tone" sub="How guided sessions sound" />
          </List>
          <Note>Small motions that stay in place — Voxu’s orb, the coin on Home — keep moving under Reduce Motion so the app never looks frozen; nothing slides across the screen.</Note>
        </>
      )
    case 'privacy':
      return (
        <>
          <List label="Your data">
            <a href="/api/account/export" download className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/[0.04]">
              <span className="min-w-0 flex-1">
                <span className="block text-px-15 text-white">Export my data</span>
                <span className="block text-px-12 text-white/55">Your journal, eras, promises, check-ins and more, as one file</span>
              </span>
              <Download className="w-4 h-4 shrink-0 text-white/50" aria-hidden />
            </a>
            <LinkRow href="/photos" title="Progress photos" sub="Private; delete any of them any time" />
          </List>
          <List label="What Voxu may use">
            <LinkRow href="/settings?s=ai-memory" title="Voxu Memory" sub="Off unless you turn it on" />
            <LinkRow href="/progress" title="Daily check-ins" sub="Off unless you turn it on" />
          </List>
          <List label="The fine print">
            <LinkRow href="/privacy" title="Privacy Policy" />
            <LinkRow href="/terms" title="Terms of Use" />
          </List>
          <List label="Leaving">
            <LinkRow href="/settings?s=account" title="Delete account" sub="In Profile & Account — removes everything, including photos" />
          </List>
        </>
      )
    case 'help':
      return (
        <>
          <List>
            <LinkRow href="mailto:support@voxu.app" external title="Email support" sub="support@voxu.app — a person reads every one" />
            <LinkRow href="/privacy" title="Privacy Policy" />
            <LinkRow href="/terms" title="Terms of Use" />
          </List>
          <p className="mt-8 text-center text-px-13 text-white/50">Voxu · 30 days, one promise a day</p>
        </>
      )
    default:
      return null
  }
}
