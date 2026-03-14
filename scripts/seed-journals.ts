import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedJournals(userId: string) {
  // Get dates for last week (Jan 11-17, 2026)
  const sampleEntries = [
    {
      date: new Date('2026-01-12'), // Sunday
      day_type: 'off',
      modules: ['morning_prime', 'bedtime_story'],
      morning_prime_done: true,
      bedtime_story_done: true,
      journal_win: 'Started my week with a calm Sunday morning routine. Feeling refreshed and ready for the week ahead.',
    },
    {
      date: new Date('2026-01-13'), // Monday
      day_type: 'work',
      modules: ['morning_prime', 'midday_reset', 'wind_down', 'bedtime_story'],
      morning_prime_done: true,
      midday_reset_done: true,
      wind_down_done: true,
      bedtime_story_done: true,
      journal_win: 'Learned that breaking tasks into smaller chunks helps me stay focused. Completed all my sessions!',
    },
    {
      date: new Date('2026-01-14'), // Tuesday
      day_type: 'work',
      modules: ['morning_prime', 'midday_reset'],
      morning_prime_done: true,
      midday_reset_done: true,
      journal_win: 'Discovered the power of 5-minute breaks between work sessions. My energy stayed consistent all day.',
    },
    {
      date: new Date('2026-01-15'), // Wednesday
      day_type: 'work',
      modules: ['morning_prime', 'wind_down', 'bedtime_story'],
      morning_prime_done: true,
      wind_down_done: true,
      bedtime_story_done: true,
      journal_win: 'The wind down session really shifted my perspective today. Small wins matter!',
    },
    {
      date: new Date('2026-01-16'), // Thursday
      day_type: 'work',
      modules: ['morning_prime', 'midday_reset', 'wind_down', 'bedtime_story'],
      morning_prime_done: true,
      midday_reset_done: true,
      wind_down_done: true,
      bedtime_story_done: true,
      journal_win: 'Best day this week! Completed every session and felt amazing all day.',
    },
    {
      date: new Date('2026-01-17'), // Friday
      day_type: 'work',
      modules: ['morning_prime'],
      morning_prime_done: true,
      journal_win: 'Even on a lighter day, showing up for the morning routine makes a difference.',
    },
  ]

  console.log(`Creating ${sampleEntries.length} sample journal entries for user ${userId}...`)

  for (const entry of sampleEntries) {
    await prisma.dailyGuide.upsert({
      where: {
        user_id_date: {
          user_id: userId,
          date: entry.date,
        },
      },
      update: {
        ...entry,
      },
      create: {
        user_id: userId,
        ...entry,
      },
    })
    console.log(`Created entry for ${entry.date.toDateString()}`)
  }

  console.log('Done! Sample journals created.')
}

// Get user ID from command line or use default
const userId = process.argv[2]

if (!userId) {
  console.log('Usage: npx ts-node scripts/seed-journals.ts <user_id>')
  console.log('\nTo find your user ID, check the Supabase dashboard or run:')
  console.log('npx prisma studio')
  process.exit(1)
}

seedJournals(userId)
  .catch(console.error)
  .finally(() => prisma.$disconnect())
