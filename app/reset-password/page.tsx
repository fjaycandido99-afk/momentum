'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Loader2, Eye, EyeOff, ChevronLeft } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Verify the user has an active session (set by the auth callback)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setChecking(false)
      if (session) {
        setHasSession(true)
      } else {
        setError('Invalid or expired reset link. Please request a new one.')
      }
    })
  }, [supabase.auth])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess(true)
      setTimeout(() => router.push('/'), 3000)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
        <p className="text-white/50 text-sm mt-4">Verifying reset link...</p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-white">
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
          <h1 className="text-2xl font-light text-white">Password updated</h1>
          <p className="text-white/70 text-sm mt-3">
            Redirecting you to the app...
          </p>
        </div>
      </div>
    )
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-white">
        <div className="mx-auto w-full max-w-sm text-center">
          <h1 className="text-2xl font-light text-white mb-4">Link expired</h1>
          <p className="text-white/70 text-sm">{error}</p>
          <Link
            href="/forgot-password"
            className="inline-block mt-8 px-6 py-3 rounded-xl bg-white/5 border border-white/15 text-white/70 hover:bg-white/10 transition-all"
          >
            Request new link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center px-6 py-12 text-white">
      <div className="mx-auto w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-6 relative flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full border-2 border-dashed border-white/25"
              style={{ animation: 'spin 8s linear infinite' }}
            />
            <div
              className="absolute inset-2 rounded-full border-2 border-dotted border-white/40"
              style={{ animation: 'spin 6s linear infinite reverse' }}
            />
            <div
              className="absolute inset-4 rounded-full border-2 border-dashed border-white/30"
              style={{ animation: 'spin 4s linear infinite' }}
            />
            <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
          </div>
          <h1 className="text-2xl font-light text-white">Set new password</h1>
          <p className="text-white/70 text-sm mt-2">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-5">
          <div>
            <label htmlFor="password" className="block text-white/70 text-sm mb-2">New password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full p-4 pr-12 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/50 focus:outline-none focus:border-white/30 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-white/70 text-sm mb-2">Confirm password</label>
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full p-4 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/50 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          {error && (
            <div role="alert" className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
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
                Updating...
              </>
            ) : (
              'Update password'
            )}
          </button>
        </form>

        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm text-white/70 mt-8 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to login
        </Link>
      </div>
    </div>
  )
}
