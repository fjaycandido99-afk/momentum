import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - List all enabled alert types (for settings UI)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const types = await prisma.alertType.findMany({
      where: { enabled: true },
      orderBy: [{ category: 'asc' }, { label: 'asc' }],
    })

    return NextResponse.json({ types })
  } catch (error) {
    console.error('Get alert types error:', error)
    return NextResponse.json({ error: 'Failed to get alert types' }, { status: 500 })
  }
}
