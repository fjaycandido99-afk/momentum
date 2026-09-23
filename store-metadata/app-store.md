# App Store Listing

<!--
Positioning (2026-09-22, for 1.2.2): the era IS the product. Pick who you're
becoming for 30 days, promise one thing a day, keep the record. Calm and
Headspace own "soundscapes + music", ChatGPT owns "talk to an AI"; a 30-day
commitment your coach holds you to is the part nobody else has.

WHAT CHANGED FROM THE 1.2.1 COPY, AND WHY: the old description led with
"Today's Minute", and MorningMinute.tsx is imported by nothing — the feature
is unreachable. Leading the App Store on a screen a downloader cannot find is
how you earn a 2.3.1 rejection and a one-star review on the same day. It also
said "6 mindset frameworks" (there are 8) and sold the Daily Guide, which is
now a redirect.

Every claim below is checked against the code. Re-check before editing:
  free/premium quotas   → lib/subscription-constants.ts (AI_FEATURE_LIMITS,
                          FREE_TIER_LIMITS.journal_history_days = 7,
                          AI_MEMORY_DEPTH free 1 day / premium 30, TRIAL_DAYS = 14)
  the 8 mindsets        → lib/mindset/configs.ts
  the 8 era presets     → lib/era/presets.ts (DEFAULT_ERA_LENGTH_DAYS = 30)
  79 movements          → lib/movements/library.ts
  Era Recap is PREMIUM  → lib/era/service.ts ("premium, finished eras")
  exercises/proofs free → app/api/exercise, app/api/proof (no premium gate)
  memory is opt-in      → lib/ai/user-context.ts
Prices are deliberately NOT in the description — App Store shows the IAP
prices itself, and they have drifted from the copy before.

Limits: name 30, subtitle 30, promo 170, keywords 100 (comma-separated, no
spaces after commas, don't repeat words already in name/subtitle),
description 4000, what's new 4000.
-->

## App Name
Voxu - Build Your Mindset

<!-- Was "Voxu - AI Audio Coach". The app is not an audio library any more,
and the name was the last place still saying so. 25 of 30 chars.
NOTE: a name change goes through review — if you want 1.2.2 out fast, ship
the description and keywords first and change the name next release. -->

## Subtitle
30 days. One promise a day.

<!-- 27 of 30. Was "A coach that talks back". -->

## Promotional Text
Pick who you're becoming for the next 30 days. Make one promise a day. Your coach keeps count — and remembers what you said on day one.

<!-- 135 of 170. Editable WITHOUT a new build or review, unlike the
description — use it for anything time-sensitive. -->

## Description
Pick who you're becoming for the next 30 days. Make one promise a day. Your coach keeps count.

Voxu is a mindset builder, not a content library. No 40-minute courses — one short loop you can still finish on a bad day.

YOUR ERA

• Choose a 30-day era: Locked In, Discipline Era, Comeback Season, Gym Arc, Stoic Mode, Confidence Mode, Study Era, 5AM Era — or name your own.

• Each morning, one promise in your own words. Each night, mark it kept and write tomorrow's while today is still fresh.

• The era runs in four chapters, so day 3 and day 27 are not asked the same thing.

A COACH THAT ANSWERS

• Pick the voice it speaks in: Stoic, Samurai Code, Existentialist, Cynic, Hedonist, Scholar, Manifestor or Hustler. Your coach, daily quotes and journal prompts all follow it. Switch anytime.

• Tap a journal question and your coach asks it, then talks it through with you — typed, or out loud.

• The wake-up call: your coach wakes you by name, and says what you promised.

• Memory, only if you want it. Turn it on and your coach reads your recent journal so you never start from zero. It stays off until you choose.

THE WORK, NOT THE WANTING

• Guided exercises Voxu runs WITH you — timed and counted — instead of a list telling you to go do something.

• A library of 79 movements, each photographed, with a swap for when the bench is taken.

• Disciplines for reading, study, work and mind, on the days you pick.

365 PROOFS

A day counts when you keep anything you said you would do. Not a streak you lose at midnight — a record of the year, that you cannot lose.

ALSO INSIDE

• The Daily Read: one quick question a day that builds a picture of how you actually think
• Circles: see how other people in your era are doing
• A journal you can export anytime
• Free motivation and focus music
• Free soundscapes for focus, rest and sleep

FREE AND PREMIUM

Free: your era and every daily promise, 365 Proofs, the guided exercises, the movement library, the Daily Read, your journal for the last 7 days, 5 coach messages a day, one spoken reply a day, and every music video and soundscape.

Premium: unlimited coach messages, up to 30 spoken replies a day, memory across your last 30 days, your full journal history, and the Era Recap — the letter your coach writes you at day 30.

Start with a 14-day free trial. Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel anytime in your Apple ID settings.

Terms: https://voxu.app/terms
Privacy: https://voxu.app/privacy

## Keywords
discipline,habits,philosophy,stoic,journal,accountability,focus,meditation,goals,motivation,streak

<!-- 98 of 100. "mindset" and "build" are dropped because they are in the app
name and Apple already indexes those. Dropped from the old set: soundscape,
affirmation, pomodoro, wellness (low intent for this product now). Kept focus
and meditation for volume; added the differentiators. -->

## Categories
- Primary: Health & Fitness
- Secondary: Lifestyle

## Age Rating
4+

## Privacy Policy URL
https://voxu.app/privacy

## Support URL
https://voxu.app/support

## What's New
Voxu is a 30-day era now.

Pick who you're becoming, promise one thing a day, and let your coach keep count. The era runs in four chapters, so the questions change as you get further in.

New:
• 365 Proofs — a day counts when you keep anything you said you'd do
• Guided exercises Voxu runs WITH you, timed and counted, instead of telling you to go do them
• A library of 79 movements, each photographed, with a swap for when the bench is taken
• Disciplines for reading, study, work and mind
• The wake-up call — your coach wakes you by name and says what you promised
• Tap a journal question and your coach asks it, then talks it through with you
• Write tomorrow's promise tonight
• Circles — see how others in your era are doing
• Turn off the parts of home you never use
• iPad support

Fixed: setup can be skipped again, spoken replies no longer say "unavailable" when they mean "sign in", and the coach no longer gets cut off mid-thought.

## Copyright
Copyright 2026 Voxu. All rights reserved.

## Review Notes
- The app requires an internet connection for AI-generated content
- Free tier: the era and daily promises, 365 Proofs, guided exercises, the movement library, the Daily Read, journal (last 7 days), 5 AI coach messages/day, 1 spoken reply/day, all music, motivation videos and soundscapes (YouTube embeds, never paywalled)
- Premium unlocks unlimited coach messages, up to 30 spoken replies/day, 30-day AI memory (opt-in), full journal history, and the day-30 Era Recap
- AI memory is OFF by default and requires explicit consent in Settings
- Background audio playback is supported via Audio background mode

### Test Account for Review
- Email: applereview@voxu.app
- Password: (confirm this before submission)
- Verified 2026-09-22: this account exists, tier `premium`, status `active`,
  period end 2027-02-27, so the reviewer sees the paid experience.
- The doc used to say `review@voxu.app`. That account DOES NOT EXIST. Pasting
  it into Review Notes is a sign-in failure and a rejection.

### Subscription Information
<!-- Confirmed in App Store Connect 2026-09-18: $6.99/mo and $49.99/yr (US),
matching the web checkout. Introductory offer on both: free for 2 weeks
(TRIAL_DAYS = 14 in lib/subscription-constants.ts) — the old 1-week offer was
deleted. Keep all three in step if any of them changes. -->
- Subscription Group: Voxu Premium
- Monthly: product ID `voxu_premium_month`
- Yearly: product ID `voxu_premium_yearly`
- Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period
- Payment is charged to the Apple ID account at confirmation of purchase

---

## Before submitting 1.2.2

1. **Screenshots.** The current set predates the era, Training and Proofs.
   Apple's 2.3.3 wants screenshots that show the app in use, and a store page
   selling a 30-day era with pictures of the old audio home converts badly
   even when it passes. Shoot: the era home mid-run, a day's promise, the
   movement screen, Training, 365 Proofs.
2. **Confirm the review account password** and that `applereview@voxu.app`
   can sign in on a clean device.
3. **Marketing version is already 1.2.2** in codemagic.yaml — 1.2.1 is
   approved and live, and Apple rejects re-uploads under an approved version.
   If 1.2.2 gets approved, bump that line to 1.2.3 before the next build.
4. The iOS app is a shell that loads voxu.app, so the web is already live for
   1.2.1 users. Everything in What's New is true for them today; the build
   exists so the App Store page can say it.
