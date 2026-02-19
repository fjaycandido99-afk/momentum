'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [rotation, setRotation] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  // Rotation animation
  useEffect(() => {
    let frame: number
    let start = performance.now()

    const animate = (time: number) => {
      const elapsed = (time - start) / 1000
      setRotation(elapsed * 45) // 45 degrees per second
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
        {/* Logo with rotating rings animation */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-6 relative flex items-center justify-center">
            {/* Outer ring - dashed, rotates clockwise slow */}
            <div
              className="absolute inset-0 rounded-full border-2 border-dashed border-white/25"
              style={{ transform: `rotate(${rotation}deg)` }}
            />
            {/* Middle ring - dotted, rotates counter-clockwise */}
            <div
              className="absolute inset-2 rounded-full border-2 border-dotted border-white/40"
              style={{ transform: `rotate(${-rotation * 1.3}deg)` }}
            />
            {/* Inner ring - dashed, rotates clockwise faster */}
            <div
              className="absolute inset-4 rounded-full border-2 border-dashed border-white/30"
              style={{ transform: `rotate(${rotation * 2}deg)` }}
            />
            {/* Center dot with glow */}
            <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
          </div>
          <h1 className="text-2xl font-light text-white">Welcome back</h1>
          <p className="text-white/70 text-sm mt-2">
            Sign in to Voxu
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-white/70 text-sm mb-2">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full p-4 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/50 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-white/70 text-sm mb-2">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full p-4 pr-12 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/50 focus:outline-none focus:border-white/30 transition-colors"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/70 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none rounded-md"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div role="alert" className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full p-4 rounded-xl bg-white text-black font-medium hover:bg-white/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none"
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
          <Link href="/forgot-password" className="text-sm text-white/50 hover:text-white/70 transition-colors">
            Forgot your password?
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-white/70 mt-8">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-white font-medium hover:text-white/90 transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
