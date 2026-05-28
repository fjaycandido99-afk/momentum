// Audiogram render via Remotion Lambda.
//
// Build-safe by design: @remotion/lambda is NOT a dependency yet. The SDK is
// pulled in via a runtime dynamic import with a non-static specifier, so the
// Next build never tries to resolve it. Until you `npm i @remotion/lambda`,
// deploy the Lambda, and set the env vars below, this returns null and callers
// fall back to the image card.
//
// Env required to go live:
//   REMOTION_LAMBDA_FUNCTION  (from `remotion lambda functions deploy`)
//   REMOTION_SERVE_URL        (from `remotion lambda sites create`)
//   REMOTION_AWS_REGION       (default us-east-1)
//   plus AWS creds (REMOTION_AWS_ACCESS_KEY_ID / SECRET) in the environment.

export interface AudiogramInput {
  quote: string
  author: string
  mindset?: string
  audioSrc: string
}

export function isAudiogramConfigured(): boolean {
  return !!(process.env.REMOTION_LAMBDA_FUNCTION && process.env.REMOTION_SERVE_URL)
}

export async function renderAudiogram(input: AudiogramInput): Promise<string | null> {
  const functionName = process.env.REMOTION_LAMBDA_FUNCTION
  const serveUrl = process.env.REMOTION_SERVE_URL
  const region = process.env.REMOTION_AWS_REGION || 'us-east-1'
  if (!functionName || !serveUrl) return null

  try {
    // Non-static specifier → webpack won't bundle/resolve it at build time.
    const spec = ['@remotion', 'lambda/client'].join('/')
    const lambda: any = await import(/* webpackIgnore: true */ spec)

    const { renderId, bucketName } = await lambda.renderMediaOnLambda({
      region,
      functionName,
      serveUrl,
      composition: 'Audiogram',
      inputProps: input,
      codec: 'h264',
      imageFormat: 'jpeg',
      privacy: 'public',
      downloadBehavior: { type: 'download', fileName: 'voxu-audiogram.mp4' },
    })

    // Poll until the render finishes (cron context — generous budget).
    for (let i = 0; i < 90; i++) {
      const progress = await lambda.getRenderProgress({ renderId, bucketName, functionName, region })
      if (progress.fatalErrorEncountered) {
        console.error('[audiogram] fatal render error', progress.errors)
        return null
      }
      if (progress.done) return progress.outputFile || null
      await new Promise((r) => setTimeout(r, 2000))
    }
    console.warn('[audiogram] render timed out')
    return null
  } catch (e) {
    // Module not installed / AWS not configured / network — fall back gracefully.
    console.error('[audiogram] render unavailable:', (e as Error).message)
    return null
  }
}
