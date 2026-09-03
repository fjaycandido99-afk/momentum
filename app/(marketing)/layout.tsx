'use client'

/**
 * Chrome for the public marketing pages (download, pricing, privacy,
 * terms, support).
 *
 * Two things were wrong here and they compounded each other:
 *
 *   1. "Back" was a hardcoded <a href="/download">. It never went back —
 *      from /pricing it always landed on the App Store download page,
 *      which is what "backing in here sends you to this page" was. It was
 *      also a plain anchor, so in the Capacitor shell it triggered a full
 *      remote page load rather than a client navigation.
 *
 *   2. Nothing here knew about the native app, so a user already inside
 *      the iOS app could be shown a page telling them to download the
 *      iOS app. Besides being nonsense, App Store review treats that as a
 *      problem.
 *
 * Now: Back uses real history when there is any, and falls back to
 * somewhere sensible per platform — the app home in the shell, the
 * download page on the web.
 */

import { useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useIsNative } from '@/hooks/useIsNative'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const isNative = useIsNative()

  // In the shell there is no "marketing site" to return to — home is the
  // app itself. On the web, the download page is the front door.
  const homeHref = isNative ? '/' : '/download'

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(homeHref)
  }

  // /download is a "please install the app" page. Inside the app that is
  // both absurd and an App Store risk, so send them to the app instead of
  // rendering it. Replace, not push, so Back doesn't bounce them into it
  // again. Privacy, terms and support stay reachable — review requires it.
  const isInstallPage = isNative && pathname === '/download'

  useEffect(() => {
    if (isInstallPage) router.replace('/')
  }, [isInstallPage, router])

  return (
    <div className="min-h-screen bg-black">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={goBack}
            aria-label="Go back"
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors press-scale"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <Link
            href={homeHref}
            className="text-lg font-semibold text-white"
          >
            Voxu
          </Link>
        </div>
      </header>

      <main className="pt-16">
        {isInstallPage ? null : children}
      </main>
    </div>
  )
}
