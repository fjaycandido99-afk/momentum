'use client'

import { usePathname } from 'next/navigation'
import { MinimalNav } from '@/components/navigation/MinimalNav'
import { DailyBackground } from '@/components/player/DailyBackground'
import { Providers } from './providers'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isHome = pathname === '/'

  return (
    <Providers>
      <div className="isolate min-h-screen bg-black">
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <DailyBackground animate />
        </div>
        <main key={pathname} className={`min-h-screen ${isHome ? '' : 'pb-16'}`}>
          {children}
        </main>
        {!isHome && <MinimalNav />}
      </div>
    </Providers>
  )
}
