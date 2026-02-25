# App Store Listing

## App Name
Voxu - AI Audio Coach

## Subtitle
Motivation, Mindfulness & Focus

## Description
Voxu is your personal AI-powered audio companion for daily growth, focus, and clarity.

Start each day with a guided session tailored to your schedule, mindset, and goals. Choose from six philosophical frameworks — Stoic, Existentialist, Cynic, Hedonist, Samurai Code, or Scholar — and let your AI coach adapt its wisdom to your chosen path.

KEY FEATURES:

- Daily Guided Sessions: Personalized morning flows with motivational content, breathing exercises, and reflections
- Ambient Soundscapes: Curated nature sounds and focus environments for deep work
- Focus Music: Lo-fi, classical, jazz, and ambient playlists to enhance concentration
- AI Coaching: Get personalized guidance adapted to your philosophical mindset
- Journal: Reflect on your day with AI-powered prompts and mood tracking
- Streak Tracking: Build consistency with daily streaks and milestone celebrations
- Beautiful Backgrounds: Animated visual themes that match your mindset

MINDSET SYSTEM:
Choose your philosophical path and watch everything adapt — AI responses, daily quotes, journal prompts, and visual themes. Switch anytime to explore new perspectives.

PREMIUM FEATURES:
- All voice tones and AI-generated audio
- Unlimited soundscapes and music genres
- Full journal history and weekly AI summaries
- AI coaching and affirmations
- Offline access

## Keywords
meditation, motivation, mindfulness, focus, audio, coach, daily, routine, stoic, music, soundscape, journal, productivity, wellness, guided

## Categories
- Primary: Health & Fitness
- Secondary: Lifestyle

## Age Rating
4+

## Privacy Policy URL
https://voxu.app/privacy

## Support URL
https://voxu.app/support

## Promotional Text
Your AI-powered daily audio coach. Guided sessions, focus music, journaling, and six philosophical mindsets to transform your routine.

## What's New (v1.0.0)
Welcome to Voxu! Your personal AI audio coach is here. Start your daily guided sessions, explore six philosophical mindsets, and build lasting habits with streaks and journaling.

## Copyright
Copyright 2025 Voxu. All rights reserved.

## Review Notes
- The app requires an internet connection for AI-generated content
- Free tier includes limited soundscapes, music, and text-only daily guides
- Premium subscription ($4.99/month) unlocks all features with a 7-day free trial
- Background audio playback is supported via Audio background mode

### Test Account for Review
- Email: review@voxu.app
- Password: (set this before submission)
- Note: Create this test account in Supabase before submitting

### Subscription Information
- Subscription Group: Voxu Premium
- Monthly: $4.99/month with 7-day free trial (product ID: voxu_premium_monthly)
- Yearly: $39.99/year with 7-day free trial (product ID: voxu_premium_yearly)
- Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period
- Payment is charged to the iTunes account at confirmation of purchase

---

## App Store Connect Configuration Checklist

<!-- Manual steps — not code. Complete these in Apple Developer Portal / App Store Connect. -->

1. **Apple Developer Account** ($99/year) — enroll at developer.apple.com
2. **App Store Connect** — create app record with bundle ID `com.voxu.app`
3. **In-App Purchases** — create subscription group "Voxu Premium":
   - `voxu_premium_monthly` — $4.99/month with 7-day free trial
   - `voxu_premium_yearly` — $39.99/year with 7-day free trial
4. **RevenueCat Dashboard** — connect App Store Connect, map product IDs, set entitlement "premium"
5. **Screenshots** — need 6.7" (iPhone 15 Pro Max) and 6.5" (iPhone 11 Pro Max) at minimum
6. **App Privacy** — fill out App Store Connect privacy questionnaire (data types: name, email, purchases, usage data)
7. **Certificates & Profiles** — create distribution certificate + provisioning profile in Xcode
8. **TestFlight** — upload first build, test IAP in sandbox
9. **Submit for Review** — include test account credentials in review notes
