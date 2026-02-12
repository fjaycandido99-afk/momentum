import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Must be logged in to seed data' }, { status: 401 })
    }

    // Sample entries for last week (Jan 12-17, 2026)
    const sampleEntries = [
      {
        date: new Date('2026-01-12'),
        day_type: 'off',
        modules: ['morning_prime', 'breath', 'day_close'],
        morning_prime_done: true,
        breath_done: true,
        day_close_done: true,
        journal_win: 'Started my week with a calm Sunday morning routine. Feeling refreshed and ready for the week ahead.',
      },
      {
        date: new Date('2026-01-13'),
        day_type: 'work',
        modules: ['morning_prime', 'movement', 'micro_lesson', 'breath', 'day_close'],
        morning_prime_done: true,
        movement_done: true,
        micro_lesson_done: true,
        breath_done: true,
        day_close_done: true,
        journal_win: 'Learned that breaking tasks into smaller chunks helps me stay focused. Completed all my morning modules!',
      },
      {
        date: new Date('2026-01-14'),
        day_type: 'work',
        modules: ['morning_prime', 'movement', 'breath'],
        morning_prime_done: true,
        movement_done: true,
        breath_done: true,
        journal_win: 'Discovered the power of 5-minute breaks between work sessions. My energy stayed consistent all day.',
      },
      {
        date: new Date('2026-01-15'),
        day_type: 'work',
        modules: ['morning_prime', 'micro_lesson', 'day_close'],
        morning_prime_done: true,
        micro_lesson_done: true,
        day_close_done: true,
        journal_win: 'The micro lesson on gratitude really shifted my perspective today. Small wins matter!',
      },
      {
        date: new Date('2026-01-16'),
        day_type: 'work',
        modules: ['morning_prime', 'movement', 'micro_lesson', 'breath', 'day_close'],
        morning_prime_done: true,
        movement_done: true,
        micro_lesson_done: true,
        breath_done: true,
        day_close_done: true,
        journal_win: 'Best day this week! Crushed my workout and learned about time-boxing for productivity.',
      },
      {
        date: new Date('2026-01-17'),
        day_type: 'work',
        modules: ['morning_prime', 'breath'],
        morning_prime_done: true,
        breath_done: true,
        journal_win: 'Even on a lighter day, showing up for the morning routine makes a difference.',
      },
      // Also add some entries for this week
      {
        date: new Date('2026-01-19'),
        day_type: 'off',
        modules: ['morning_prime', 'day_close'],
        morning_prime_done: true,
        day_close_done: true,
        journal_win: 'Took it easy on Sunday. Rest is part of the journey.',
      },
      {
        date: new Date('2026-01-20'),
        day_type: 'work',
        modules: ['morning_prime', 'movement', 'micro_lesson', 'breath', 'day_close'],
        morning_prime_done: true,
        movement_done: true,
        micro_lesson_done: true,
        breath_done: true,
        day_close_done: true,
        journal_win: 'Monday energy was high! Started the week with full commitment to my goals.',
      },
      {
        date: new Date('2026-01-21'),
        day_type: 'work',
        modules: ['morning_prime', 'movement', 'breath'],
        morning_prime_done: true,
        movement_done: true,
        breath_done: true,
        journal_win: 'Breathing exercises before a big meeting really helped calm my nerves.',
      },
    ]

    let created = 0
    for (const entry of sampleEntries) {
      await prisma.dailyGuide.upsert({
        where: {
          user_id_date: {
            user_id: user.id,
            date: entry.date,
          },
        },
        update: entry,
        create: {
          user_id: user.id,
          ...entry,
        },
      })
      created++
    }

    return NextResponse.json({
      success: true,
      message: `Created ${created} sample journal entries`,
      entries: created,
    })
  } catch (error) {
    console.error('Seed sample data error:', error)
    return NextResponse.json({ error: 'Failed to seed data' }, { status: 500 })
  }
}
