import { createClient } from '@/lib/supabase/server'
import { loadEraToday } from '@/lib/era/service'
import { eraCardImage, sampleEra } from '@/lib/era/card'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET — the signed-in user's era as a Story-sized share card (PNG). Rendered
 * on the server so it looks the same on every phone — the serif, the art,
 * the bar — instead of screenshotting the DOM in a WebView.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)

  // ?sample=<preset key>: a made-up day-17 card, no user data — for checking
  // the layout on the real renderer and for marketing images.
  const sample = url.searchParams.get('sample')
  if (sample) {
    const era = sampleEra(sample)
    return era ? eraCardImage(era, url.origin) : new Response('Unknown era', { status: 404 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const era = await loadEraToday(user.id)
  if (!era) return new Response('No era', { status: 404 })

  return eraCardImage(era, url.origin)
}
