# Google Play Store Listing

<!-- Same positioning and claim sources as app-store.md — keep the two in
step. See that file's header for where to re-check every claim (quotas,
mindsets, era presets, movement count, what is premium).

Play's limits differ from Apple's: title 30, short description 80, full
description 4000, and RELEASE NOTES ARE ONLY 500 — a tenth of Apple's
4000, so the What's New below is its own shorter piece of writing, not a
copy-paste of the iOS one.

Prices are left out on purpose; Play shows them on the subscription sheet.

Rewritten 2026-09-22 for the same reason as the App Store copy: this led
with "Today's Minute", and MorningMinute.tsx is imported by nothing. The
feature is unreachable, so it cannot be the hook. -->

## App Name
Voxu - Build Your Mindset

## Short Description
A 30-day era. One promise a day. Your coach keeps count.

## Full Description
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

Start with a 14-day free trial. Subscriptions renew automatically until cancelled. Manage or cancel anytime in Google Play.

Terms: https://voxu.app/terms
Privacy: https://voxu.app/privacy

## Release Notes
Pick who you're becoming for 30 days, promise one thing a day, and let your coach keep count.

Inside: 365 Proofs — a day counts when you keep anything you said you'd do. Guided exercises Voxu runs with you, timed and counted. A library of 79 movements with a swap for when the bench is taken. Disciplines for reading, study, work and mind. A wake-up call that says what you promised. Tap a journal question and your coach asks it, then talks it through with you.

## Category
Health & Fitness

## Tags
philosophy, stoic, discipline, journal, accountability, habits, AI coach, self improvement

## Content Rating
Everyone

## Privacy Policy
https://voxu.app/privacy

---

## STATE OF THE ANDROID BUILD (checked 2026-09-22)

Voxu has never shipped on Play, and the project cannot currently produce a
release build:

- `android/app/build.gradle` — `versionCode 1`, `versionName "1.0"`, both
  untouched Capacitor defaults.
- **No `signingConfig` of any kind.** `assembleRelease` produces an unsigned
  artifact, which Play rejects.
- `codemagic.yaml` has one workflow, `ios-build`. There is no Android CI.
- No Play Billing products exist for `voxu_premium_month` /
  `voxu_premium_yearly`, so RevenueCat has nothing to map on Android and
  premium cannot be purchased there.

`targetSdkVersion = 36` and `minSdkVersion = 24` are fine — Play's floor for
new apps is well below 36.

### What has to happen, in order

Code (can be done here):
1. An upload keystore, generated locally and **never committed**. Reference it
   from `build.gradle` through Gradle properties / CI environment variables.
2. `signingConfigs.release` wired into `buildTypes.release`.
3. `versionCode` / `versionName` set deliberately — and a rule for bumping
   `versionCode` on every upload, since Play refuses a repeat.
4. An `android-build` workflow in codemagic.yaml producing an **AAB**, not an
   APK. Play has required AAB for new apps since August 2021.

Play Console (only Francis can do these):
5. Create the app record under `com.voxu.app`.
6. **Data safety form** — must declare every data type collected and match
   https://voxu.app/privacy exactly. This is where most submissions stall.
7. Content rating questionnaire.
8. Play Billing: create the subscription group and both product IDs, then map
   them in RevenueCat to the `premium` entitlement.
9. Graphics: 512×512 icon, 1024×500 feature graphic, at least 2 phone
   screenshots (the iOS set does not satisfy Play's aspect requirements).
10. Closed testing before production. **If the Play developer account is a
    personal/individual account created after November 2023, Google requires
    12 testers for 14 continuous days before production access is granted.**
    That is weeks, not an afternoon. An account that has already published a
    production app is past this gate.
