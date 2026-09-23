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

### Build plumbing — DONE 2026-09-22

- `android/app/build.gradle` now has a `signingConfigs.release` fed from
  `android/key.properties` (local) or `VOXU_KEYSTORE_*` environment variables
  (CI). With neither, `release` is left **unsigned and logs a warning** rather
  than silently falling back to the debug key — a debug-signed AAB is refused
  by Play with a message that does not mention signing.
- `versionCode` comes from `-PvoxuVersionCode`, `versionName` from
  `-PvoxuVersionName` (default `1.2.2`, matching iOS). Play refuses a
  versionCode it has already accepted, so CI computes the next one.
- `android/.gitignore` — `*.jks`, `*.keystore` and `key.properties` are now
  ignored. **They arrived from the template commented out**, so a keystore
  generated in that directory would have been committed by the next
  `git add -A`. An upload key in a git history has to be replaced, and Play
  will not then accept builds signed with the old one.
- `codemagic.yaml` has an `android-build` workflow producing an **AAB**
  (required for new apps since August 2021), with the same changeset guard as
  iOS so web-only pushes do not trigger a build.

### The keystore — generate it yourself, once

Never let this file into git, and do not lose it: Play ties the app to this
key forever, and losing it means asking Google to reset your upload key.

```
keytool -genkey -v -keystore upload.jks -keyalg RSA -keysize 2048 \
  -validity 10000 -alias voxu-upload
```

`keytool` ships with a JDK; there is none on the dev machine as of
2026-09-23 (`winget install EclipseAdoptium.Temurin.21.JDK`).

**For CI: upload it in Codemagic, do not encode it.** Code signing
identities → Android keystores, reference name **`voxu_upload`** — which is
what `environment.android_signing` names in codemagic.yaml. Codemagic then
sets `CM_KEYSTORE_PATH`, `CM_KEYSTORE_PASSWORD`, `CM_KEY_ALIAS` and
`CM_KEY_PASSWORD`, and `android/app/build.gradle` reads them directly.

The first attempt used a `google_play` variable group holding a base64 of the
keystore. It failed the build at startup — *"Codemagic.yaml references to
unknown variable group(s): google_play"*, before any step ran — and it meant
pushing a signing key through a clipboard. No group is referenced any more,
so there is nothing to misname.

For a signed build on this machine, put `android/key.properties` (gitignored)
beside the keystore:

```
storeFile=/absolute/path/to/upload.jks
storePassword=...
keyAlias=voxu-upload
keyPassword=...
```

Back the keystore up somewhere that is not this machine. Run
`node scripts/android-secrets.cjs` to see what is still missing.

### Before uploading ANY build to Play

Run the build with `VOXU_REQUIRE_PUSH=1` set in Codemagic. Without it the
workflow builds happily when `google-services.json` is absent — deliberately,
so a platform that has never shipped is not blocked by an errand in the
Firebase console — and prints a banner saying push is dead in that build.
That is fine for checking the pipeline and sideloading the APK. It is not
fine to upload: the nudges are most of what the product does.

So the gate is here, not in the build:

- [ ] `android/app/google-services.json` committed
- [ ] `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`
      set in Vercel (the server half — `isFCMConfigured()` is false without
      all three)
- [ ] a build run with `VOXU_REQUIRE_PUSH=1` that went green
- [ ] a real notification received on a real Android device

### Play Console — only Francis can do these

1. Create the app record under `com.voxu.app`.
2. **Data safety form** — must declare every data type collected and match
   https://voxu.app/privacy exactly. This is where most submissions stall.
3. Content rating questionnaire.
4. Play Billing: create the subscription group and both product IDs
   (`voxu_premium_month`, `voxu_premium_yearly`), then map them in RevenueCat
   to the `premium` entitlement. **Until this exists, premium is unbuyable on
   Android** — the paywall will open and fail.
5. Graphics: 512×512 icon, 1024×500 feature graphic, at least 2 phone
   screenshots. The iOS set does not satisfy Play's requirements.
6. **Upload the first AAB by hand.** Play will not accept an API upload to an
   app that has never had a manual release, which is why `publishing:` is
   commented out in the workflow. Turn it on after the first upload.
7. Closed testing before production. **If the Play developer account is a
   personal/individual account created after November 2023, Google requires
   12 testers for 14 continuous days before production access is granted.**
   That is weeks, not an afternoon. An account that has already published a
   production app is past this gate.

### Android push — everything except the two things only Google can give you

The server half has been built the whole time: `lib/fcm.ts` sends through
firebase-admin, `PushSubscription.platform` already distinguishes
`web` / `ios` / `android`, and the client calls `Capacitor.getPlatform()`,
which returns `android`. iOS does **not** go through Firebase at all — it
uses APNs directly via `lib/apns.ts` — so this is an Android-only gap.

Done 2026-09-22:
- `ic_stat_voxu.xml` — a monochrome status-bar icon. Android 5+ draws this as
  a silhouette, and the launcher icon used in its place renders as a white
  square, so this had to exist before push was worth turning on.
- `colors.xml` + `default_notification_channel_id` in strings, and all three
  `com.google.firebase.messaging.default_notification_*` meta-data entries in
  the manifest. **Android 8+ silently drops a notification that arrives with
  no channel**, which is the failure nobody can debug.
- `build.gradle` no longer swallows a missing google-services.json into
  `logger.info`. A **release** build now FAILS; debug only warns, so
  `npx cap run android` still works. Override with `-PallowNoPush=true`.
- CI writes the file from a `GOOGLE_SERVICES_JSON` variable, and fails if
  neither that nor a committed copy is present.
- `POST_NOTIFICATIONS` was already declared — Android 13+ needs it.

**The two things I cannot produce, because only Google issues them:**

1. **`android/app/google-services.json`** — Firebase Console → Project
   settings → Your apps → Add app → Android → package name `com.voxu.app` →
   download. Save to `android/app/google-services.json`. It contains a real
   `mobilesdk_app_id`, project number and API key that only Google can mint;
   a hand-written one fails at registration, so there is no way to stub it.
   Not a secret — it ships inside the APK and its key is restricted to the
   package name — so committing it is fine, and simpler than the CI variable.

2. **`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`**
   in Vercel — from a service account JSON (Firebase Console → Project
   settings → Service accounts → Generate new private key). `isFCMConfigured()`
   returns false without all three, and `lib/push-service.ts` then skips every
   Android subscription. **None of the three is set in local `.env`, and the
   Vercel token here is 403 on reading project env vars, so production could
   not be checked** — confirm it yourself in the Vercel dashboard.

Until both halves exist, an Android install registers, stores no token, and
receives nothing.
