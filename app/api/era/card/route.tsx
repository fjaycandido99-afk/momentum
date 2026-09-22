import { createClient } from '@/lib/supabase/server'
import { loadEraToday } from '@/lib/era/service'
import { eraCardImage, sampleEra, SAMPLE_STATS } from '@/lib/era/card'
import { cardDaysSoFar, type CardStatsInput } from '@/lib/era/card-stats'
import { nextDay } from '@/lib/era/logic'
import { loadProofDaysBetween } from '@/lib/proof/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET — the signed-in user's era as a Story-sized share card (PNG). Rendered
 * on the server so it looks the same on every phone — the serif, the art,
 * the bar — instead of screenshotting the DOM in a WebView.
 *
 * ?numbers=0 leaves the record off the card. The share sheet asks; the
 * default is to show it.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const showNumbers = url.searchParams.get('numbers') !== '0'

  // ?sample=<preset key>: a made-up day-17 card, no user data — for checking
  // the layout on the real renderer and for marketing images.
  const sample = url.searchParams.get('sample')
  if (sample) {
    const era = sampleEra(sample)
    return era ? eraCardImage(era, url.origin, showNumbers ? SAMPLE_STATS : null) : new Response('Unknown era', { status: 404 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const era = await loadEraToday(user.id)
  if (!era) return new Response('No era', { status: 404 })

  if (!showNumbers) return eraCardImage(era, url.origin, null)

  // Era day N is start + (N−1). The window stops at today, or at the era's
  // last day once it has run its length.
  const lastDay = Math.min(Math.max(1, era.day), era.lengthDays)
  const days: string[] = [era.startDay]
  while (days.length < lastDay) days.push(nextDay(days[days.length - 1]))

  // The proof line is extra: if it can't be read, the card still goes out
  // with the promise line, rather than failing the share.
  let proof: Set<string> | null = null
  try {
    proof = await loadProofDaysBetween(user.id, days[0], days[days.length - 1])
  } catch {
    proof = null
  }

  const todayLocal = era.day >= 1 && era.day <= era.lengthDays ? days[era.day - 1] : null
  const stats: CardStatsInput = {
    promisesKept: era.stats.kept,
    promisesAnswered: era.stats.answered,
    proofDays: proof ? proof.size : null,
    daysSoFar: cardDaysSoFar(era.day, era.lengthDays, !!(todayLocal && proof?.has(todayLocal))),
  }
  return eraCardImage(era, url.origin, stats)
}
