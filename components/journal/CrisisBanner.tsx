'use client'

/**
 * Crisis resources shown above the AI's reply when the message the user
 * just sent contains crisis language.
 *
 * Deliberately not a modal and not dismissible-by-accident: it sits in
 * the conversation, above the reply, so it reads as part of the response
 * rather than an interruption. The AI is separately instructed not to
 * list phone numbers itself, so this is the single place they appear.
 *
 * Tone matters here. No alarm colours, no sirens — a red flashing banner
 * tells someone they've said something wrong. This is quiet and warm.
 */

import { Phone, ExternalLink } from 'lucide-react'

interface Resource {
  label: string
  href: string
  phone?: string
}

export interface CrisisContent {
  headline: string
  body: string
  resources: Resource[]
}

export function CrisisBanner({ content }: { content: CrisisContent }) {
  return (
    <div
      role="note"
      aria-label="Support resources"
      className="rounded-2xl border border-white/20 bg-white/[0.06] p-4 space-y-2.5"
    >
      <p className="text-sm font-medium text-white">{content.headline}</p>
      <p className="text-xs leading-relaxed text-white/75">{content.body}</p>
      <div className="flex flex-wrap gap-2 pt-0.5">
        {content.resources.map(r => {
          const external = r.href.startsWith('http')
          return (
            <a
              key={r.href}
              href={r.href}
              {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.08] px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/[0.14] press-scale"
            >
              {external ? <ExternalLink className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
              {r.label}
            </a>
          )
        })}
      </div>
    </div>
  )
}
