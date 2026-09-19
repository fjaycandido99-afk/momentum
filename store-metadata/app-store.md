# App Store Listing

<!--
Positioning (2026-09-18): lead with ONE hook — a philosophy coach that talks
back — instead of the feature list. Calm/Headspace own "soundscapes + music",
ChatGPT owns "talk to an AI"; the morning conversation in a chosen philosophy
is the part nobody else has. Everything else lives under "Also inside".

Every claim below is checked against the code. Re-check before editing:
free/premium quotas → lib/subscription-constants.ts (AI_FEATURE_LIMITS,
AI_MEMORY_DEPTH); mindsets → lib/mindset/configs.ts; memory is opt-in →
lib/ai/user-context.ts. Prices are deliberately NOT in the description —
App Store shows the IAP prices itself, and they have drifted from the copy
before.

Limits: name 30, subtitle 30, promo 170, keywords 100 (comma-separated, no
spaces after commas, don't repeat words already in name/subtitle).
-->

## App Name
Voxu: Stoic AI Coach

## Subtitle
A coach that talks back

## Promotional Text
Speak for one minute each morning. Your coach answers in the voice of the philosophy you choose, then keeps the conversation going.

## Description
Say one minute of what's on your mind. Your coach answers out loud, in the voice of the philosophy you choose, and keeps talking with you.

Voxu is a morning coach, not a content library. No 40-minute courses. Just a real conversation to start your day.

HOW IT WORKS

• Today's Minute: each morning, speak (or type) what's on your mind. Your coach replies through your chosen philosophy, then you talk it through together.

• Talk or text: choose whether your coach speaks its replies or stays quiet. Speak or type either way, so it works on a bus as well as at home.

• Pick your philosophy: Stoic, Samurai Code, Existentialist, Cynic, Hedonist, Scholar, Manifestor or Hustler. Your coach, daily quotes and journal prompts all follow it. Switch anytime.

• The Daily Read: one quick question a day. Over the weeks it builds a picture of how you actually think.

• Memory, only if you want it: turn it on and your coach reads your recent journal, so you never start from zero. It stays off until you choose.

ALSO INSIDE

• A journal you can export anytime
• A daily guide shaped around your wake time and schedule
• Free motivation and focus music videos
• Free soundscapes for focus, rest and sleep
• Streaks and progress

FREE AND PREMIUM

Free: Today's Minute, your journal (last 7 days), 5 coach messages a day, one spoken reply a day, and every music video and soundscape.

Premium: unlimited conversation, up to 30 spoken replies a day, memory across your last 30 days, full journal history, every voice tone and every guided voice session.

Start with a free trial. Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel anytime in your Apple ID settings.

Terms: https://voxu.app/terms
Privacy: https://voxu.app/privacy

## Keywords
philosophy,motivation,journal,morning routine,mindset,samurai,marcus aurelius,seneca,daily,voice

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
Your coach talks back now. Record Today's Minute and keep the conversation going, out loud or by text. Also new: the Daily Read, and music, motivation and soundscapes are now free for everyone.

## Copyright
Copyright 2026 Voxu. All rights reserved.

## Review Notes
- The app requires an internet connection for AI-generated content
- Free tier: Today's Minute, journal (last 7 days), 5 AI coach messages/day, 1 spoken reply/day, all music, motivation videos and soundscapes (YouTube embeds, never paywalled)
- Premium unlocks unlimited coach messages, up to 30 spoken replies/day, 30-day AI memory (opt-in), full journal history, all voice tones and guided voice sessions
- Background audio playback is supported via Audio background mode

### Test Account for Review
- Email: review@voxu.app
- Password: (set this before submission)
- Note: Create this test account in Supabase before submitting

### Subscription Information
<!-- CHECK against App Store Connect before relying on these. The web
checkout charges $6.99/mo and $49.99/yr with a 14-day trial
(app/(marketing)/pricing/page.tsx, TRIAL_DAYS in
lib/subscription-constants.ts). The IAP products were originally set up at
$4.99 / $39.99 with a 7-day trial and may never have been changed. -->
- Subscription Group: Voxu Premium
- Monthly: product ID `voxu_premium_monthly`
- Yearly: product ID `voxu_premium_yearly`
- Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period
- Payment is charged to the Apple ID account at confirmation of purchase

---

## App Store Connect Configuration Checklist

<!-- Manual steps — not code. Complete these in Apple Developer Portal / App Store Connect. -->

1. **Apple Developer Account** ($99/year) — enroll at developer.apple.com
2. **App Store Connect** — create app record with bundle ID `com.voxu.app`
3. **In-App Purchases** — create subscription group "Voxu Premium":
   - `voxu_premium_monthly`
   - `voxu_premium_yearly`
4. **RevenueCat Dashboard** — connect App Store Connect, map product IDs, set entitlement "premium"
5. **Screenshots** — need 6.7" (iPhone 15 Pro Max) and 6.5" (iPhone 11 Pro Max) at minimum
6. **App Privacy** — fill out App Store Connect privacy questionnaire (data types: name, email, purchases, usage data)
7. **Certificates & Profiles** — create distribution certificate + provisioning profile in Xcode
8. **TestFlight** — upload first build, test IAP in sandbox
9. **Submit for Review** — include test account credentials in review notes
