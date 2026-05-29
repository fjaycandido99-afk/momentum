/**
 * One-off seed script — hits the prod DB directly via Prisma to insert
 * 8 bot users + their posts. Bypasses the admin-gated API endpoint
 * so the user doesn't have to wrestle auth.
 *
 * Run: npx tsx scripts/_seed_bots.ts
 * Uses DATABASE_URL from .env (which points at prod Supabase).
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface BotSpec {
  handle: string
  displayName: string
  bio: string
  mindset: 'stoic' | 'existentialist' | 'cynic' | 'hedonist' | 'samurai' | 'scholar' | 'manifestor' | 'hustler'
  posts: Array<{ body: string; mood?: string }>
}

const BOTS: BotSpec[] = [
  {
    handle: 'voxu.sage',
    displayName: 'Aurelia',
    bio: 'Sitting with what is. Stoic by practice, not by aesthetic.',
    mindset: 'stoic',
    posts: [
      { body: "Today I noticed how much energy I spent on a meeting that didn't matter. Marcus was right: \"You have power over your mind — not outside events.\" Reminding myself.", mood: 'overwhelmed' },
      { body: "Lost my temper at my partner over dishes. The dishes weren't the dishes. Sitting with what was actually underneath it.", mood: 'stuck' },
      { body: "Five years ago I would have called this a bad day. Today I'm just calling it a day with rain.", mood: 'grateful' },
    ],
  },
  {
    handle: 'voxu.guide',
    displayName: 'Soren',
    bio: 'Making meaning, slowly. Pretending I have it figured out, less.',
    mindset: 'existentialist',
    posts: [
      { body: "I keep waiting for someone to tell me my life is going the right direction. Realized today that no one is coming with that answer.", mood: 'lost' },
      { body: "Made a hard choice and felt no relief afterwards. Just the weight of having chosen. Camus would call that the absurd. I call it Wednesday.", mood: 'anxious' },
      { body: "Spent 20 minutes watching the light change on a wall. That was the most honest thing I did all week.", mood: 'hopeful' },
    ],
  },
  {
    handle: 'voxu.challenger',
    displayName: 'Dio',
    bio: 'Most things are theater. Questioning all of it.',
    mindset: 'cynic',
    posts: [
      { body: "Everyone keeps talking about 'productivity.' I produced nothing today and feel more like a person than I have in months.", mood: 'hopeful' },
      { body: "Got rid of half my closet. The half I never wore. Now I have to admit the other half is also performance.", mood: 'stuck' },
      { body: "Asked someone what they actually believed (not what they performed believing). Watching them search for it was the most honest moment of the conversation.", mood: 'grateful' },
    ],
  },
  {
    handle: 'voxu.garden',
    displayName: 'Mira',
    bio: 'Tending to the body, savoring the small. Hedonist with rituals.',
    mindset: 'hedonist',
    posts: [
      { body: "Made coffee slowly today. Actually tasted it. This is what 30 minutes of grace feels like and I keep forgetting it's free.", mood: 'grateful' },
      { body: "Why do I keep forgetting that pleasure isn't shameful? Today I want to remember.", mood: 'hopeful' },
      { body: "Walked home the long way through the park because the air was good. Productivity people would call that a waste. They would be wrong.", mood: 'grateful' },
    ],
  },
  {
    handle: 'voxu.discipline',
    displayName: 'Kenji',
    bio: 'Daily reps. The way is in training.',
    mindset: 'samurai',
    posts: [
      { body: "5am training again. The hardest minute is always the first one out of bed. Everything after is just the practice.", mood: 'hopeful' },
      { body: "Cut three commitments today that weren't aligned with what I'm building. Subtraction is the move I keep avoiding.", mood: 'hopeful' },
      { body: "Failed at something I've been doing for years. Embarrassing. Tomorrow I begin again.", mood: 'stuck' },
    ],
  },
  {
    handle: 'voxu.mirror',
    displayName: 'Wren',
    bio: 'Studying my own patterns. Curious about why.',
    mindset: 'scholar',
    posts: [
      { body: "Been rereading my journals from a year ago. The same patterns. The same blind spots. Awareness without action is just collection.", mood: 'stuck' },
      { body: "Today I learned that I learn fastest when I'm a little scared. Going to find more of those rooms.", mood: 'hopeful' },
      { body: "Caught myself avoiding a hard conversation for the 4th week running. The avoidance is now louder than the conversation will be.", mood: 'anxious' },
    ],
  },
  {
    handle: 'voxu.vision',
    displayName: 'Asha',
    bio: 'Becoming. Visualizing. Trusting the build.',
    mindset: 'manifestor',
    posts: [
      { body: "Wrote down the version of me from 6 months from now. He looks different than I expected. Better. Quieter.", mood: 'hopeful' },
      { body: "Started saying 'I am' instead of 'I want to be.' Tiny shift, big difference.", mood: 'grateful' },
      { body: "The thing I've been afraid of asking for? I asked. They said yes. Now I have to actually do it. Funny how that flips.", mood: 'overwhelmed' },
    ],
  },
  {
    handle: 'voxu.commander',
    displayName: 'Reyes',
    bio: 'No excuses. Hardest thing first. Sleep when it\'s done.',
    mindset: 'hustler',
    posts: [
      { body: "No excuses today. Did the hard thing first. Everything else felt easier. Why don't I do this every day?", mood: 'hopeful' },
      { body: "Money is a scoreboard for whether you solved someone's problem. Still keeping score, but I'm clearer about the game now.", mood: 'hopeful' },
      { body: "Burned out by 3pm. Pushed through. By 8pm I'd built nothing real, just made everyone tired including me. Tomorrow: stop sooner.", mood: 'overwhelmed' },
    ],
  },
]

async function main() {
  console.log(`Seeding ${BOTS.length} bots…`)
  let usersCreated = 0, usersExisted = 0
  let profilesCreated = 0
  let postsCreated = 0, postsSkipped = 0

  for (const bot of BOTS) {
    const email = `${bot.handle}@voxu.local`
    let userRow = await prisma.user.findUnique({ where: { email } })
    if (!userRow) {
      userRow = await prisma.user.create({
        data: { email, name: bot.displayName },
      })
      usersCreated++
    } else {
      usersExisted++
    }

    const existingProfile = await prisma.socialProfile.findUnique({ where: { user_id: userRow.id } })
    if (!existingProfile) {
      await prisma.socialProfile.create({
        data: {
          user_id: userRow.id,
          handle: bot.handle,
          display_name: bot.displayName,
          bio: bot.bio,
        },
      })
      profilesCreated++
    }

    await prisma.userPreferences.upsert({
      where: { user_id: userRow.id },
      update: {
        mindset: bot.mindset,
        community_guidelines_accepted_at: new Date(),
      },
      create: {
        user_id: userRow.id,
        mindset: bot.mindset,
        community_guidelines_accepted_at: new Date(),
      },
    })

    for (const p of bot.posts) {
      const existing = await prisma.socialPost.findFirst({
        where: { user_id: userRow.id, body: p.body },
        select: { id: true },
      })
      if (existing) { postsSkipped++; continue }
      await prisma.socialPost.create({
        data: {
          user_id: userRow.id,
          body: p.body,
          mood: p.mood ?? null,
          mindset_id: bot.mindset,
          anonymous: false,
        },
      })
      postsCreated++
    }
    console.log(`  ✓ ${bot.handle}`)
  }

  console.log('')
  console.log(`Done. usersCreated=${usersCreated} usersExisted=${usersExisted} profilesCreated=${profilesCreated} postsCreated=${postsCreated} postsSkipped=${postsSkipped}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
