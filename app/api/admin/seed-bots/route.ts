/**
 * POST /api/admin/seed-bots — populate the Community with 8 bot users
 * (one per mindset) and 3-4 sample reflections each, so the feed +
 * per-mindset pages + mood filters all have realistic content to
 * demo and design against.
 *
 * Idempotent: re-running skips any bot that already has a profile +
 * skips any post body that already exists for that bot.
 *
 * Admin-gated via ADMIN_USER_IDS — same pattern as the moderation
 * queue. Returns counts of created vs skipped so you can verify
 * what happened.
 *
 * To remove the bots later: DELETE /api/admin/seed-bots (drops every
 * SocialProfile with handle starting "voxu.").
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function isAdmin(userId: string, email: string | undefined): boolean {
  const allow = (process.env.ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
  if (allow.includes(userId)) return true
  // Owner-email fallback so the project owner can seed without first
  // having to wrestle ADMIN_USER_IDS into the env. Case-insensitive
  // match. Skip cleanly if either side is empty.
  const ownerEmail = (process.env.ADMIN_OWNER_EMAIL || '').trim().toLowerCase()
  if (ownerEmail && email && email.toLowerCase() === ownerEmail) return true
  return false
}

interface BotSpec {
  handle: string
  displayName: string
  bio: string
  mindset: 'stoic' | 'existentialist' | 'cynic' | 'hedonist' | 'samurai' | 'scholar' | 'manifestor' | 'hustler'
  posts: Array<{ body: string; mood?: string }>
}

// Hand-written voices per mindset — short reflections that read like
// real journal shares, not formulaic prompts. Tone matches each
// mindset's promptTone from MINDSET_CONFIGS.
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

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdmin(user.id, user.email)) return NextResponse.json({ error: 'Forbidden', hint: 'Set ADMIN_USER_IDS or ADMIN_OWNER_EMAIL in env to allow yourself.' }, { status: 403 })

    let usersCreated = 0
    let usersExisted = 0
    let profilesCreated = 0
    let postsCreated = 0
    let postsSkipped = 0

    for (const bot of BOTS) {
      // 1. User row — keyed by a unique synthetic email so we never
      //    collide with a real account.
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

      // 2. SocialProfile
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

      // 3. UserPreferences w/ mindset (drives the per-mindset feed
      //    grouping + the mindset chip on profiles). Also flip the
      //    community-guidelines acceptance so bot posts don't need
      //    to be pre-accepted manually.
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

      // 4. Posts — dedupe by exact body match so re-running doesn't
      //    pile up duplicates.
      for (const p of bot.posts) {
        const existingPost = await prisma.socialPost.findFirst({
          where: { user_id: userRow.id, body: p.body },
          select: { id: true },
        })
        if (existingPost) { postsSkipped++; continue }
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
    }

    return NextResponse.json({
      ok: true,
      summary: {
        bots: BOTS.length,
        usersCreated,
        usersExisted,
        profilesCreated,
        postsCreated,
        postsSkipped,
      },
    })
  } catch (err) {
    console.error('[seed-bots POST]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    )
  }
}

// Clean up all seed bots — wipes any SocialProfile whose handle starts
// with "voxu." plus the underlying User rows. Cascades drop their
// posts / reactions / follows automatically.
export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdmin(user.id, user.email)) return NextResponse.json({ error: 'Forbidden', hint: 'Set ADMIN_USER_IDS or ADMIN_OWNER_EMAIL in env to allow yourself.' }, { status: 403 })

    const botProfiles = await prisma.socialProfile.findMany({
      where: { handle: { startsWith: 'voxu.' } },
      select: { user_id: true, handle: true },
    })
    const botUserIds = botProfiles.map(p => p.user_id)
    if (botUserIds.length === 0) return NextResponse.json({ ok: true, deleted: 0 })

    const result = await prisma.user.deleteMany({ where: { id: { in: botUserIds } } })
    return NextResponse.json({ ok: true, deleted: result.count, handles: botProfiles.map(p => p.handle) })
  } catch (err) {
    console.error('[seed-bots DELETE]', err)
    return NextResponse.json({ error: 'unknown' }, { status: 500 })
  }
}
