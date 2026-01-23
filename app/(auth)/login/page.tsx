'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Volume2, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pulseScale, setPulseScale] = useState(1)
  const router = useRouter()
  const supabase = createClient()

  // Breathing animation for the orb
  useEffect(() => {
    let frame: number
    let start = performance.now()

    const animate = (time: number) => {
      const elapsed = (time - start) / 1000
      const scale = 1 + Math.sin(elapsed * Math.PI / 3) * 0.08
      setPulseScale(scale)
      frame = requestAnimationFrame(animate)
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-12 text-white">
      <div className="mx-auto w-full max-w-sm">
        {/* Logo with breathing animation */}
        <div className="text-center mb-10">
          <div
            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center transition-transform duration-500"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05))',
              boxShadow: '0 0 60px rgba(255, 255, 255, 0.15)',
              transform: `scale(${pulseScale})`,
            }}
          >
            <Volume2 className="w-9 h-9 text-white/80" />
          </div>
          <h1 className="text-2xl font-light text-white/90">Welcome back</h1>
          <p className="text-white/40 text-sm mt-2">
            Sign in to Momentum
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-white/60 text-sm mb-2">Email</label>
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          <div>
            <label className="block text-white/60 text-sm mb-2">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full p-4 rounded-xl bg-white text-black font-medium hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Forgot password */}
        <div className="text-center mt-6">
          <Link href="/forgot-password" className="text-sm text-white/40 hover:text-white/70 transition-colors">
            Forgot your password?
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-white/40 mt-8">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-white font-medium hover:text-white/80 transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
