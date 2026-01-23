import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch journal entries for a date or date range
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Single date query
    if (date) {
      const targetDate = new Date(date)
      targetDate.setHours(0, 0, 0, 0)

      const guide = await prisma.dailyGuide.findUnique({
        where: {
          user_id_date: {
            user_id: user.id,
            date: targetDate,
          },
        },
        select: {
          date: true,
          journal_win: true,
          journal_gratitude: true,
          journal_learned: true,
          journal_intention: true,
        },
      })

      return NextResponse.json(guide || { date: targetDate, journal_win: null, journal_gratitude: null, journal_learned: null, journal_intention: null })
    }

    // Date range query (for calendar/history)
    if (startDate && endDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)

      const guides = await prisma.dailyGuide.findMany({
        where: {
          user_id: user.id,
          date: {
            gte: start,
            lte: end,
          },
        },
        select: {
          date: true,
          journal_win: true,
          journal_gratitude: true,
          journal_learned: true,
          journal_intention: true,
          day_close_done: true,
          morning_prime_done: true,
          movement_done: true,
          micro_lesson_done: true,
          breath_done: true,
        },
        orderBy: {
          date: 'asc',
        },
      })

      return NextResponse.json({ entries: guides })
    }

    // Default: return this week's entries
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const guides = await prisma.dailyGuide.findMany({
      where: {
        user_id: user.id,
        date: {
          gte: startOfWeek,
        },
      },
      select: {
        date: true,
        journal_win: true,
        journal_gratitude: true,
        journal_learned: true,
        journal_intention: true,
      },
      orderBy: {
        date: 'asc',
      },
    })

    return NextResponse.json({ entries: guides })
  } catch (error) {
    console.error('Get journal error:', error)
    return NextResponse.json(
      { error: 'Failed to get journal entries' },
      { status: 500 }
    )
  }
}

// POST - Save journal entry
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { date, journal_win, journal_gratitude, journal_learned, journal_intention } = body

    const targetDate = date ? new Date(date) : new Date()
    targetDate.setHours(0, 0, 0, 0)

    // Update the daily guide with journal entry
    const guide = await prisma.dailyGuide.upsert({
      where: {
        user_id_date: {
          user_id: user.id,
          date: targetDate,
        },
      },
      update: {
        ...(journal_win !== undefined && { journal_win }),
        ...(journal_gratitude !== undefined && { journal_gratitude }),
        ...(journal_learned !== undefined && { journal_learned }),
        ...(journal_intention !== undefined && { journal_intention }),
      },
      create: {
        user_id: user.id,
        date: targetDate,
        day_type: 'work', // Default, will be updated by guide generation
        journal_win,
        journal_gratitude,
        journal_learned,
        journal_intention,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        date: guide.date,
        journal_win: guide.journal_win,
        journal_gratitude: guide.journal_gratitude,
        journal_learned: guide.journal_learned,
        journal_intention: guide.journal_intention,
      },
    })
  } catch (error) {
    console.error('Save journal error:', error)
    return NextResponse.json(
      { error: 'Failed to save journal entry' },
      { status: 500 }
    )
  }
}
