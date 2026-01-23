import { BottomNav } from '@/components/navigation/BottomNav'
import { Providers } from './providers'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // No auth check - guests can use the app freely
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
