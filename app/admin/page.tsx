import Link from 'next/link'
import { currentAdmin } from '@/lib/auth/admin'
import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard'

/**
 * /admin — the owner's dashboard, opened by signing in rather than by
 * carrying a secret in the URL.
 *
 * Gated on the server: a visitor who isn't an admin never receives the
 * dashboard code or a single number, and the API refuses them separately
 * (app/api/analytics/stats), so neither side is trusting the other.
 *
 * "Not an admin" and "not signed in" get the same page on purpose — this
 * URL shouldn't confirm to a stranger that it's worth attacking.
 */
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Voxu admin', robots: { index: false, follow: false } }

export default async function AdminPage() {
  const admin = await currentAdmin()

  if (!admin) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-white/60 text-sm">Nothing here.</p>
          <p className="text-white/35 text-xs mt-2">
            If this is your dashboard, sign in with your owner account first.
          </p>
          <Link href="/login" className="inline-block mt-4 text-xs text-white/70 underline underline-offset-2">
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-black text-white px-4 pt-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/40">Signed in as {admin.email}</p>
          <Link href="/" className="text-xs text-white/60 underline underline-offset-2">Back to Voxu</Link>
        </div>
      </div>
      <AnalyticsDashboard />
    </>
  )
}
