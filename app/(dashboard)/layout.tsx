'use client'

import { usePathname } from 'next/navigation'
import { MinimalNav } from '@/components/navigation/MinimalNav'
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
      <div className="min-h-screen bg-black">
        <main className={`min-h-screen ${isHome ? '' : 'pb-16'}`}>
          {children}
        </main>
        {!isHome && <MinimalNav />}
      </div>
    </Providers>
  )
}
