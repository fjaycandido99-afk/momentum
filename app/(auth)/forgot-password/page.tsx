'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, CheckCircle, Loader2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess(true)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex-1 flex flex-col justify-center px-6 py-12 text-white">
        <div className="mx-auto w-full max-w-sm text-center">
          <div
            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.4), rgba(22, 163, 74, 0.2))',
              boxShadow: '0 0 60px rgba(34, 197, 94, 0.3)',
            }}
          >
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-light text-white/90">Check your email</h1>
          <p className="text-white/40 text-sm mt-3">
            We sent a password reset link to <span className="text-white/70">{email}</span>
          </p>
          <Link
            href="/login"
            className="inline-block mt-8 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all"
          >
            Back to login
          </Link>
        </div>
      </div>
    )
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
          <h1 className="text-2xl font-light text-white/90">Reset password</h1>
          <p className="text-white/40 text-sm mt-2">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleResetPassword} className="space-y-5">
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
                Sending...
              </>
            ) : (
              'Send reset link'
            )}
          </button>
        </form>

        {/* Footer */}
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm text-white/40 mt-8 hover:text-white/70 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to login
        </Link>
      </div>
    </div>
  )
}
