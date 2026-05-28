# Voxu Audiogram (Remotion)

Shareable 9:16 video for Reels / TikTok / Stories — monochrome aura + the quote +
an audio-synced waveform + "Listen on Voxu". The composition lives here
(`Audiogram.tsx`); rendering runs on **Remotion Lambda**.

This folder is **excluded from the Next.js typecheck** (`tsconfig.json` →
`exclude`), so it never affects the web build. Remotion deps aren't installed yet
(install them when you start — below).

## 1. Preview locally (no AWS needed)
```bash
npm i remotion @remotion/cli @remotion/media-utils @remotion/lambda @remotion/player
npx remotion studio remotion/index.ts
```
Studio opens the "Audiogram" composition with sample props — tweak the look here.
(Drop a real `public/sample-quote.mp3` or point `audioSrc` at any public mp3 to
see the waveform react.)

## 2. Match duration to the audio (production)
The default is a fixed 25s. In production set the duration from the audio so the
video is exactly as long as the spoken quote — use Remotion's `calculateMetadata`
on the Composition with `getAudioDurationInSeconds(audioSrc)` from
`@remotion/media-utils` (× fps).

## 3. Deploy the renderer (Remotion Lambda — needs your AWS account)
```bash
# AWS creds in env (REMOTION_AWS_ACCESS_KEY_ID / SECRET). One-time:
npx remotion lambda functions deploy
npx remotion lambda sites create remotion/index.ts --site-name=voxu-audiogram
```
This gives you a function name + a serve URL. Put both in env
(`REMOTION_LAMBDA_FUNCTION`, `REMOTION_SERVE_URL`).

## 4. Render endpoint + cache (server)
Add `app/api/audiogram/route.ts` (I can write this once Lambda is deployed):
- Input: `{ mindset, date }` (or a quote id).
- **Cache first** — check Supabase storage `audiograms/{mindset}_{date}.mp4`; if it
  exists, return its URL. (Deterministic per mindset/day = render once, reuse.)
- Else: get/generate the spoken-quote audio (reuse the ElevenLabs `AudioCache`),
  call `renderMediaOnLambda({ serveUrl, functionName, composition: 'Audiogram',
  inputProps: { quote, author, mindset, audioSrc } })`, upload the MP4 to Supabase
  storage, return the URL.
- **Cost killer:** a daily cron pre-renders the 8 mindsets' quote → 8 renders/day,
  cached. Every user sharing that day's quote gets the cached MP4 instantly.

## 5. Client "Share as video"
On the quote card, a "Share as video" action:
- `GET /api/audiogram?mindset=…&date=…` → MP4 URL (or "Generating…" then poll).
- Share the file via `@capacitor/share` (install it) on native, or the Web Share
  API with the MP4 file. Always fall back to the existing image card.

## Cost / caveats
- Lambda render ≈ $0.01–0.03/video; Supabase storage negligible; ElevenLabs audio
  is capped (500k char/mo) so **hard-cache** the spoken quote.
- Verify the MP4 shares cleanly to IG/TikTok early.
- Remotion is free under their revenue threshold — check before scaling.
