import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getAchievementById } from '@/lib/achievements'
import { relicCardImage } from '@/lib/relic-card'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET ?id=<achievement id> — the share card for a coin they have EARNED.
 * Anything they don't hold is a 404: the card says "earned", so it has to be.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id') ?? ''
  const a = getAchievementById(id)
  if (!a) return new Response('Unknown relic', { status: 404 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const held = await prisma.userAchievement.findUnique({
    where: { user_id_achievement_id: { user_id: user.id, achievement_id: a.id } },
    select: { unlocked_at: true },
  })
  if (!held) return new Response('Not earned', { status: 404 })

  return relicCardImage(a, held.unlocked_at, url.origin)
}
