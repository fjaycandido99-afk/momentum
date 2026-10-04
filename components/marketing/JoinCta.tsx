'use client'

import { useEffect, useState } from 'react'
import { isNativeApp } from '@/lib/native'
import Link from 'next/link'

export const APP_STORE_URL = 'https://apps.apple.com/app/id6759702163'

/**
 * The join page's button. On an iPhone or iPad in a browser — which is where
 * a link tapped in Messages lands — the app is the product (Voxu is
 * native-first), so the main button gets the app and the web start is
 * offered underneath. Inside the app itself, or anywhere else, it starts the
 * era right here as before.
 *
 * The web start keeps the sharer's credit (?from= rides along); the App Store
 * can't carry a link through an install, which is why the web path stays.
 */
export function JoinCta({ startHref, label }: { startHref: string; label: string }) {
  const [ios, setIos] = useState(false)
  useEffect(() => {
    const ua = navigator.userAgent
    const iDevice = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
    const inApp = isNativeApp()
    setIos(iDevice && !inApp)
  }, [])

  if (!ios) {
    return (
      <Link
        href={startHref}
        className="pointer-events-auto block w-full max-w-md mx-auto text-center py-4 rounded-2xl bg-white text-black text-sm font-medium active:scale-[0.98] transition-all"
      >
        {label}
      </Link>
    )
  }
  return (
    <div className="pointer-events-auto w-full max-w-md mx-auto">
      <a
        href={APP_STORE_URL}
        className="block w-full text-center py-4 rounded-2xl bg-white text-black text-sm font-medium active:scale-[0.98] transition-all"
      >
        Get Voxu on the App Store
      </a>
      <Link href={startHref} className="block text-center mt-3 text-px-13 text-white/70 underline underline-offset-4">
        or {label.charAt(0).toLowerCase() + label.slice(1)} on the web
      </Link>
    </div>
  )
}
