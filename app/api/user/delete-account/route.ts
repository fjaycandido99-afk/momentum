import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id

    // Find the internal user record
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!dbUser) {
      // User might only exist in auth — still delete auth record
      const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      )
      await adminClient.auth.admin.deleteUser(userId)
      return NextResponse.json({ success: true })
    }

    // Delete all user data in FK-safe order using a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Alert system (AlertHistory references ScheduledAlert)
      await tx.alertHistory.deleteMany({ where: { user_id: userId } })
      await tx.scheduledAlert.deleteMany({ where: { user_id: userId } })
      await tx.userAlertPreference.deleteMany({ where: { user_id: userId } })

      // 2. Goals & achievements
      await tx.goal.deleteMany({ where: { user_id: userId } })
      await tx.userAchievement.deleteMany({ where: { user_id: userId } })

      // 3. Sessions & favorites
      await tx.session.deleteMany({ where: { user_id: userId } })
      await tx.favoriteContent.deleteMany({ where: { user_id: userId } })

      // 4. Daily guides
      await tx.dailyGuide.deleteMany({ where: { user_id: userId } })

      // 5. Notifications
      await tx.pushSubscription.deleteMany({ where: { user_id: userId } })

      // 6. Playlists (cascade deletes PlaylistItems)
      await tx.playlist.deleteMany({ where: { user_id: userId } })

      // 7. Routines (cascade deletes RoutineSteps)
      await tx.routine.deleteMany({ where: { user_id: userId } })

      // 8. XP events
      await tx.xPEvent.deleteMany({ where: { user_id: userId } })

      // 9. Preferences & subscription
      await tx.userPreferences.deleteMany({ where: { user_id: userId } })
      await tx.subscription.deleteMany({ where: { user_id: userId } })

      // 10. Finally delete the user record
      await tx.user.delete({ where: { id: userId } })
    })

    // Delete the auth user via Supabase admin
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    await adminClient.auth.admin.deleteUser(userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Account deletion failed:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 },
    )
  }
}
