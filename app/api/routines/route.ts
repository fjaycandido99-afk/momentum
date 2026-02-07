import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - List user's routines
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const routines = await prisma.routine.findMany({
      where: { user_id: user.id },
      include: { steps: { orderBy: { position: 'asc' } } },
      orderBy: { updated_at: 'desc' },
    })

    return NextResponse.json({ routines })
  } catch (error) {
    console.error('Get routines error:', error)
    return NextResponse.json({ error: 'Failed to get routines' }, { status: 500 })
  }
}

// POST - Create a new routine with steps
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, description, icon, steps } = await request.json()
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    // Check freemium limit
    const sub = await prisma.subscription.findUnique({ where: { user_id: user.id } })
    const isPremium = sub?.tier === 'premium' && (sub?.status === 'active' || sub?.status === 'trialing')

    if (!isPremium) {
      const count = await prisma.routine.count({ where: { user_id: user.id } })
      if (count >= 1) {
        return NextResponse.json({ error: 'Free users can create 1 routine. Upgrade for unlimited.' }, { status: 403 })
      }
    }

    const routine = await prisma.routine.create({
      data: {
        user_id: user.id,
        name,
        description,
        icon,
        steps: steps?.length ? {
          create: steps.map((s: { activity_type: string; activity_id: string; title: string; subtitle?: string; duration_minutes?: number }, i: number) => ({
            activity_type: s.activity_type,
            activity_id: s.activity_id,
            title: s.title,
            subtitle: s.subtitle,
            duration_minutes: s.duration_minutes,
            position: i,
          })),
        } : undefined,
      },
      include: { steps: { orderBy: { position: 'asc' } } },
    })

    return NextResponse.json({ routine })
  } catch (error) {
    console.error('Create routine error:', error)
    return NextResponse.json({ error: 'Failed to create routine' }, { status: 500 })
  }
}
