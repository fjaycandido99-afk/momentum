# Audiogram — Project Scope

**Goal:** a shareable 15–25s **9:16 MP4** (audio + monochrome visuals) for Reels /
TikTok / Stories — drifting aura on black + the quote (animated in) + an
audio-synced waveform + "Listen on Voxu" wordmark + mindset tag. Audio = the
spoken quote (ElevenLabs) over an optional ambient bed. Social-ready (H.264 MP4).

**Render approach (decided): Remotion Lambda.** React-based video → reuses the
app's aura aesthetic; reliable MP4; ~pennies/render. Composition built in
`/remotion` (see its README). Lambda deploy needs the AWS account.

## The cost-killer
Daily quote is **deterministic per (mindset × day)**. A cron pre-renders **8
videos/day** (one per mindset), cached in Supabase storage. Every user sharing
that day's quote gets the cached MP4 instantly — same pattern as the shared
`AudioCache`. Per-user/custom audiograms render on-demand later.

## Phases (~1.5–2.5 weeks focused)
1. **Render setup** — `npm i` Remotion, deploy Lambda function + site, env vars. *2–4d*
2. **Composition** — aura + quote-in + synced waveform + branding (✅ scaffolded in `/remotion`). *2–3d polish*
3. **Audio prep** — spoken-quote clip (reuse ElevenLabs cache) + ambient bed. *1–2d*
4. **Cache + storage** — Supabase bucket, key `audiograms/{mindset}_{date}.mp4`, daily cron. *1d*
5. **Client UX** — "Share as video" on the quote card → cached MP4 → native share (`@capacitor/share`). *1–2d*
6. **Cost controls + polish** — rate limits, monitoring, fall back to the image card. *1d*

## Risks / caveats
- iOS MP4 share to IG/TikTok — verify early.
- ElevenLabs 500k char/mo cap — hard-cache the spoken quote.
- Remotion licensing above a revenue threshold.
- AWS setup tax (the reason this isn't shippable purely from the web pipeline).
- Always fall back to the shipped image card if a render isn't ready.

## What's done vs pending
- ✅ Composition scaffolded (`/remotion/Audiogram.tsx`), previewable locally.
- ✅ Image-card sharing is live + audio-forward ("Listen on Voxu").
- ⏳ Needs AWS: Lambda deploy, render endpoint, cache cron, client wiring.

## Status
v1 = daily quote → 9:16 MP4, cached per mindset/day, "Share as video" on the quote
card. Custom/journal audiograms + 1:1 format = later.
