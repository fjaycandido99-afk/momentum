import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/navigation/BottomNav'
import { Providers } from './providers'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <Providers>
      <div className="min-h-screen bg-[#0a0a0f]">
        <main className="min-h-screen pb-20">
          {children}
        </main>
        <BottomNav />
      </div>
    </Providers>
  )
}
