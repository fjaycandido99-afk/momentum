import Link from 'next/link'
import { currentAdmin } from '@/lib/auth/admin'
import { MOVEMENTS, PATTERN_LABELS, PATTERN_ORDER } from '@/lib/movements/library'
import { allTechniqueForEditor } from '@/lib/movements/technique-server'
import { TechniqueEditor } from '@/components/admin/TechniqueEditor'

/**
 * /admin/movements — where reviewed technique guidance gets written.
 *
 * The app refuses to author form cues, so this is the door they come
 * through: someone qualified types them, their name goes on the screen with
 * the date, and the movement's hero picks up its callouts.
 *
 * Gated on the server like the rest of /admin. A visitor who isn't an admin
 * receives the same nothing as a stranger at /admin, and the API refuses
 * them separately.
 */
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Movement guidance', robots: { index: false, follow: false } }

export default async function AdminMovementsPage() {
  const admin = await currentAdmin()

  if (!admin) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-white/60 text-sm">Nothing here.</p>
          <Link href="/login" className="inline-block mt-4 text-xs text-white/70 underline underline-offset-2">
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  const technique = await allTechniqueForEditor()
  const movements = PATTERN_ORDER.flatMap(pattern =>
    MOVEMENTS.filter(m => m.pattern === pattern).map(m => ({
      id: m.id,
      name: m.name,
      pattern: PATTERN_LABELS[m.pattern],
      reviewedBy: technique[m.id]?.reviewedBy || null,
      published: technique[m.id]?.published ?? false,
    })),
  )

  const publishedCount = Object.values(technique).filter(t => t.published).length
  const draftCount = Object.values(technique).filter(t => !t.published).length

  return (
    <div className="min-h-screen bg-black text-white px-5 py-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/admin" className="text-[11px] text-white/45 hover:text-white/80">
          ← Admin
        </Link>
        <h1 className="text-2xl mt-3">Movement guidance</h1>
        <p className="text-sm text-white/55 mt-2 leading-relaxed">
          {publishedCount} of {MOVEMENTS.length} movements have published guidance, {draftCount} have an
          unsigned draft waiting. The
          rest show &ldquo;Voxu doesn&rsquo;t teach technique&rdquo;, which is the honest state until
          somebody qualified fills them in.
        </p>
        <p className="text-[12px] text-white/40 mt-2 leading-relaxed">
          Whoever is named here is the person standing behind these words on a paying customer&rsquo;s
          screen. Sets, reps, loads and times are refused — how to move is the reviewer&rsquo;s call,
          how much belongs to the person and their own coach.
        </p>

        <TechniqueEditor movements={movements} existing={technique} />
      </div>
    </div>
  )
}
