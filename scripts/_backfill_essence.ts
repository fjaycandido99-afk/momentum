/**
 * One-off backfill: extract AI essence for any SocialPost without one,
 * over a length threshold. Targets the seed bots + any real posts that
 * existed before the essence field was added.
 *
 * Run: npx tsx scripts/_backfill_essence.ts
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { extractEssence } from '../lib/social/essence'

const prisma = new PrismaClient()

async function main() {
  const posts = await prisma.socialPost.findMany({
    where: { essence: null, hidden: false },
    select: { id: true, body: true },
    orderBy: { created_at: 'desc' },
    take: 200,
  })
  console.log(`Backfilling essence for ${posts.length} posts…`)
  let updated = 0, skipped = 0
  for (const p of posts) {
    const essence = await extractEssence(p.body)
    if (essence) {
      await prisma.socialPost.update({ where: { id: p.id }, data: { essence } })
      updated++
      console.log(`  ✓ ${p.id.slice(0, 8)}  "${essence.slice(0, 60)}…"`)
    } else {
      skipped++
    }
  }
  console.log(`\nDone. updated=${updated} skipped=${skipped}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
