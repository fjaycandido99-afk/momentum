'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (!authData.user) {
        setError('Failed to create account')
        return
      }

      const response = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authData.user.id,
          email,
          name,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to set up account')
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
            {/* Outer ring - rotates clockwise */}
            <div
              className="absolute inset-0 rounded-full border-2 border-white/20 animate-spin"
              style={{ animationDuration: '8s' }}
            />
            {/* Middle ring - rotates counter-clockwise */}
            <div
              className="absolute inset-2 rounded-full border-2 border-white/30 animate-spin"
              style={{ animationDuration: '6s', animationDirection: 'reverse' }}
            />
            {/* Inner ring - rotates clockwise faster */}
            <div
              className="absolute inset-4 rounded-full border-2 border-white/40 animate-spin"
              style={{ animationDuration: '4s' }}
            />
            {/* Center dot */}
            <div className="w-4 h-4 rounded-full bg-white/60" />
          </div>
          <h1 className="text-2xl font-light text-white/90">Create your account</h1>
          <p className="text-white/40 text-sm mt-2">
            Start your journey with Momentum
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label className="block text-white/60 text-sm mb-2">Your name</label>
            <input
              type="text"
              placeholder="John"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

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
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
            />
            <p className="text-white/30 text-xs mt-2">At least 6 characters</p>
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
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-white/40 mt-8">
          Already have an account?{' '}
          <Link href="/login" className="text-white font-medium hover:text-white/80 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
