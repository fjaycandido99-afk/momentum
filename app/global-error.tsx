'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white min-h-screen flex items-center justify-center">
        <div className="text-center px-6 max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/5 border border-white/15 flex items-center justify-center">
            <span className="text-2xl">!</span>
          </div>
          <h1 className="text-xl font-medium mb-2">Something went wrong</h1>
          <p className="text-white/75 text-sm mb-6">
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            className="px-6 py-3 bg-white text-black rounded-full text-sm font-medium hover:bg-white/90 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
