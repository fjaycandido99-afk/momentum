# Audiogram — go-live runbook (~10 min)

Everything in the app is built and waiting. These steps run on **your** AWS +
Vercel accounts (they create billed resources / set secrets, so they can't be
done from a chat session). Copy-paste, top to bottom.

## 0. One-time: AWS credentials for Remotion
1. AWS console → IAM → **Users → Create user** (e.g. `remotion-voxu`), programmatic access.
2. Generate the exact policy Remotion needs and attach it:
   ```bash
   npx remotion lambda policies user   # prints the IAM policy JSON to paste
   ```
   Create that policy in IAM and attach it to the user.
3. Save the user's **Access key ID** + **Secret**. Put them in your shell:
   ```bash
   export REMOTION_AWS_ACCESS_KEY_ID=AKIA...
   export REMOTION_AWS_SECRET_ACCESS_KEY=...
   export REMOTION_AWS_REGION=us-east-1
   ```

## 1. Install the render deps
```bash
npm i remotion @remotion/cli @remotion/lambda @remotion/media-utils
```

## 2. Preview the look (optional but recommended)
```bash
npx remotion studio remotion/index.ts
```
Tweak `remotion/Audiogram.tsx` until it feels right.

## 3. Deploy the renderer
```bash
npx remotion lambda functions deploy          # → note the function name
npx remotion lambda sites create remotion/index.ts --site-name=voxu-audiogram   # → note the "Serve URL"
```

## 4. Set the env vars (Vercel → Project → Settings → Environment Variables)
```
REMOTION_LAMBDA_FUNCTION   = <function name from step 3>
REMOTION_SERVE_URL         = <serve URL from step 3>
REMOTION_AWS_REGION        = us-east-1
REMOTION_AWS_ACCESS_KEY_ID = <from step 0>
REMOTION_AWS_SECRET_ACCESS_KEY = <from step 0>
```
Also confirm `ELEVENLABS_API_KEY`, `CRON_SECRET`, and `NEXT_PUBLIC_SITE_URL`
(=`https://voxu.app`) are set. Redeploy so the env takes effect.

## 5. Verify
```bash
# Manually trigger the daily pre-render (or wait for the 6am cron):
curl -H "Authorization: Bearer $CRON_SECRET" https://voxu.app/api/cron/audiogram
# → {"rendered": 8, "date": "..."}   (8 = one per mindset)
```
Then open the home **Daily Wisdom** card — the **Video** button now appears, and
tapping it shares the MP4. (Until renders exist it stays hidden and the image
card is the fallback — by design.)

## Notes
- Cost: ~$0.01–0.03 per render × 8/day = pennies/day. Cached in `AudioCache`
  (`audiogram-{mindset}-{date}`), so each is rendered once.
- The composition uses Georgia (system serif) + Inter. For pixel-exact Inter,
  load it via `@remotion/google-fonts/Inter` in `Audiogram.tsx` (optional polish).
- If the cron returns `{"skipped": ...}`, the env vars aren't set yet.
- Hand me the function name + serve URL if you want me to double-check anything,
  but no more code is needed — it's wired.
