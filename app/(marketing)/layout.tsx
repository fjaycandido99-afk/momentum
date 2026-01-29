import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-black">
      {/* Simple header with back button */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to app</span>
          </Link>
          <Link
            href="/"
            className="text-lg font-semibold text-white"
          >
            Voxu
          </Link>
        </div>
      </header>

      {/* Content with header offset */}
      <main className="pt-16">
        {children}
      </main>
    </div>
  )
}
