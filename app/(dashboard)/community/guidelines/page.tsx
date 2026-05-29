/* ============================================================================
   /community/guidelines — Community Guidelines.

   Tone notes (intentional):
   - Warm, not legalistic. This isn't a TOS — it's a culture statement.
   - First-person plural ("we") because the community IS the people in it.
   - Each guideline pairs the rule with the "why" so readers understand the
     intent, not just the rule.
   - Crisis resources live at the bottom + are auto-pinned by the crisis
     detector on relevant posts.

   Server-rendered (no client interactivity needed here). The acceptance
   gate lives in a separate <CommunityGuidelinesGate> component that
   pops a modal on first-share attempt and links here.
   ============================================================================ */

import Link from 'next/link'
import { ChevronLeft, Heart, MessageCircleHeart, ShieldAlert, EyeOff, Ban, AlertTriangle } from 'lucide-react'

export const metadata = {
  title: 'Community Guidelines · Voxu',
  description: 'How we share, listen, and support each other in the Voxu Community.',
}

const SECTIONS: { icon: typeof Heart; title: string; body: string }[] = [
  {
    icon: Heart,
    title: 'Share what\'s real.',
    body: 'The point of this space is honest reflection — wins, struggles, breakthroughs, questions. Half-truths and performative wins make it harder for everyone. Write what you\'d write in your private journal, and then choose to share it.',
  },
  {
    icon: MessageCircleHeart,
    title: 'Reactions are solidarity, not approval.',
    body: 'When you tap 🪞 relate or 🌱 learn, you\'re saying "I see you" or "thank you" — not "I judge this." There are no likes here on purpose. We don\'t do popularity contests.',
  },
  {
    icon: ShieldAlert,
    title: 'No advice unless asked.',
    body: 'When someone shares a hard moment, the helpful instinct is often to fix it. Resist. Comment with "I\'ve been there" or "thank you for sharing" instead. If they ask for advice, give it gently.',
  },
  {
    icon: EyeOff,
    title: 'Anonymous is a feature, not a workaround.',
    body: 'Post anonymously whenever you need to — vulnerability is the whole point. But anonymous doesn\'t mean consequence-free. Anonymous accounts are still moderated and still bound by these guidelines.',
  },
  {
    icon: Ban,
    title: 'Block and report when you need to.',
    body: 'You can block any user from their profile or the ⋯ menu on a post — they\'ll silently disappear from your feed and can no longer interact with you. Report posts that cross lines (abuse, spam, content that worries you about the author\'s safety). A real human reviews every report.',
  },
  {
    icon: AlertTriangle,
    title: 'Crisis content is taken seriously.',
    body: 'If a post mentions self-harm, suicidal thoughts, or being in genuine danger, our auto-detector pins crisis resources to the post and flags it for review. Comments are paused on those posts until a human checks in — not to silence anyone, but to make sure the response is the right one.',
  },
]

const NOT_ALLOWED = [
  'Harassment, bullying, slurs, threats, or hate speech',
  'Content that glorifies or encourages self-harm or eating disorders',
  'Sharing other people\'s private content / identifying info (doxxing)',
  'Spam, advertising, promotional links, MLM pitches',
  'AI-generated content posted as your own real reflection',
  'Sexually explicit content — Voxu isn\'t the platform for that',
]

export default function CommunityGuidelinesPage() {
  return (
    <div className="min-h-screen text-white pb-24 lg:max-w-5xl lg:mx-auto">
      <div className="px-6 pt-12 pb-3">
        <Link href="/community" className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white">
          <ChevronLeft className="w-4 h-4" /> Community
        </Link>
      </div>

      <div className="px-6">
        <header className="mb-7">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Community Guidelines</h1>
          <p className="text-[15px] text-white/70 leading-relaxed">
            Voxu Community is a place to share reflections from your inner life — wins, struggles,
            patterns, questions — and to be witnessed by other people doing the same thing.
            Here&apos;s how we keep it that way.
          </p>
        </header>

        {/* Six core principles */}
        <div className="space-y-3">
          {SECTIONS.map((s) => {
            const Icon = s.icon
            return (
              <section key={s.title} className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-white/75" />
                  <h2 className="text-[15px] font-semibold text-white">{s.title}</h2>
                </div>
                <p className="text-[14px] text-white/75 leading-relaxed">{s.body}</p>
              </section>
            )
          })}
        </div>

        {/* What's not allowed */}
        <section className="mt-7 p-4 rounded-2xl bg-red-500/[0.05] border border-red-400/20">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-200/85 mb-3">
            What gets your post removed
          </h2>
          <ul className="space-y-1.5">
            {NOT_ALLOWED.map(item => (
              <li key={item} className="text-[14px] text-white/85 leading-relaxed flex gap-2">
                <span className="text-red-300 shrink-0">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-[12px] text-white/55 mt-4 leading-relaxed">
            Repeated violations get the account suspended. Severe violations (threats, doxxing,
            content that endangers minors) result in immediate removal + appropriate reports
            to authorities where required by law.
          </p>
        </section>

        {/* Crisis resources */}
        <section className="mt-7 p-4 rounded-2xl bg-amber-500/[0.06] border border-amber-400/25">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/90">
              If you&apos;re in crisis
            </h2>
          </div>
          <p className="text-[14px] text-white/85 leading-relaxed mb-3">
            Voxu Community is a place to be heard, but it is not crisis care. If you are thinking
            about hurting yourself or someone else, please reach out — these lines are free,
            confidential, and open right now:
          </p>
          <ul className="space-y-1.5">
            <li><a href="tel:988" className="text-[14px] text-amber-200 hover:text-white underline underline-offset-2">Call or text 988 (US)</a></li>
            <li><a href="sms:741741&body=HOME" className="text-[14px] text-amber-200 hover:text-white underline underline-offset-2">Text HOME to 741741 (US Crisis Text Line)</a></li>
            <li><a href="tel:116123" className="text-[14px] text-amber-200 hover:text-white underline underline-offset-2">Samaritans 116 123 (UK / Ireland)</a></li>
            <li><a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className="text-[14px] text-amber-200 hover:text-white underline underline-offset-2">Find a helpline (worldwide)</a></li>
          </ul>
        </section>

        <p className="text-[12px] text-white/45 leading-relaxed mt-8 mb-6 text-center">
          Last updated: 2026. By posting to Voxu Community, you agree to these guidelines and to
          our broader{' '}
          <Link href="/settings" className="underline hover:text-white">Privacy &amp; Terms</Link>.
        </p>
      </div>
    </div>
  )
}
