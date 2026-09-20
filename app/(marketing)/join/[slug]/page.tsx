import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ERA_PRESETS_BY_KEY, DEFAULT_ERA_LENGTH_DAYS, eraName } from '@/lib/era/presets'
import { programFor } from '@/lib/era/programs'
import { ERA_MISSIONS } from '@/lib/era/missions'
import { eraKeyFromSlug, eraSlug } from '@/lib/era/share'

/**
 * /join/<era> — where a shared era card sends people.
 *
 * Someone saw a friend's "Day 14 of my Locked In era" and tapped. This page
 * has one job: show what the era is and get them to day 1. Server-rendered,
 * so it's fast from a link and the preview (opengraph-image) matches.
 *
 * `?from=` is the sharer's era id; it rides into /era so the join is
 * credited (EraReferral). Nothing about the sharer is shown here.
 */

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const key = eraKeyFromSlug(params.slug)
  const preset = key ? ERA_PRESETS_BY_KEY.get(key) : null
  if (!preset) return { title: 'Voxu' }
  const title = `Join the ${eraName(preset.title)} — Voxu`
  const description = `${preset.tagline} ${DEFAULT_ERA_LENGTH_DAYS} days. One promise a day. Your coach keeps count.`
  return {
    title,
    description,
    openGraph: { title, description, url: `https://voxu.app/join/${eraSlug(preset.key)}` },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default function JoinEraPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { from?: string }
}) {
  const key = eraKeyFromSlug(params.slug)
  const preset = key ? ERA_PRESETS_BY_KEY.get(key) : null
  if (!key || !preset) notFound()

  const program = programFor(key)
  const firstWeek = (ERA_MISSIONS[key] ?? []).slice(0, 3)
  const from = typeof searchParams.from === 'string' && searchParams.from.length <= 64 ? searchParams.from : null
  const startHref = `/era?start=${key}${from ? `&from=${encodeURIComponent(from)}` : ''}`

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero — the era's art with its name set over the foot. */}
      <div className="relative w-full aspect-[4/5] max-h-[64vh] overflow-hidden">
        {program.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={program.image} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover object-right grayscale opacity-80" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-6 pb-6">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/60">You&rsquo;re invited to an era</p>
          <h1 className="text-[52px] leading-[0.9] uppercase mt-2" style={{ ...SERIF, fontWeight: 600 }}>{preset.title}</h1>
          <p className="text-[17px] text-white/80 mt-3 leading-snug" style={SERIF}>{preset.tagline}</p>
        </div>
      </div>

      <div className="px-6 pb-40 space-y-8 max-w-md mx-auto">
        <p className="text-sm text-white/75 leading-relaxed mt-2">
          {DEFAULT_ERA_LENGTH_DAYS} days. Each morning you make yourself one promise, and your coach answers it. Each night
          you say whether you kept it. Voxu keeps the count.
        </p>

        {firstWeek.length > 0 && (
          <section>
            <h2 className="text-[10px] uppercase tracking-[0.24em] text-white/45 mb-3">How it starts</h2>
            <ol className="space-y-2.5">
              {firstWeek.map((m, i) => (
                <li key={i} className="flex gap-3 rounded-xl border border-white/[0.12] bg-white/[0.03] p-3">
                  <span className="text-[11px] text-white/45 tabular-nums pt-0.5 shrink-0">Day {i + 1}</span>
                  <span className="text-[15px] text-white leading-snug" style={SERIF}>{m}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <p className="text-[11px] text-white/40">
          Free to start. The era, your promises and check-ins are free forever.
        </p>

        {/* Said before they join, not after: a shared link puts them in the
            sharer's circle (lib/era/circle.ts), and this is all it shows. */}
        {from && (
          <p className="text-[11px] text-white/40 -mt-4">
            Joining from a shared link puts you in their circle: they&rsquo;ll see your first name, your era and how
            far in you are — never what you promise. You can hide yourself any time.
          </p>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pt-10 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] bg-gradient-to-t from-black from-70% to-transparent pointer-events-none">
        <Link
          href={startHref}
          className="pointer-events-auto block w-full max-w-md mx-auto text-center py-4 rounded-2xl bg-white text-black text-sm font-medium active:scale-[0.98] transition-all"
        >
          Start your {eraName(preset.title)}
        </Link>
      </div>
    </div>
  )
}
