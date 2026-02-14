'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Auth error boundary caught:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center px-6 max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <span className="text-2xl">!</span>
        </div>
        <h1 className="text-xl font-medium mb-2">Authentication error</h1>
        <p className="text-white/60 text-sm mb-6">
          Something went wrong during sign in. Please try again.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="px-6 py-3 bg-white text-black rounded-full text-sm font-medium hover:bg-white/90 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/login"
            className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-full text-sm font-medium hover:bg-white/10 transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
