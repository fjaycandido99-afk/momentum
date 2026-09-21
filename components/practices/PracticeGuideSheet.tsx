'use client'

import { X } from 'lucide-react'
import { GUIDE_LIMIT_NOTE, guideForDomain } from '@/lib/practices/guides'
import { PRESETS_BY_KEY } from '@/lib/practices/presets'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * How to do the thing well — the part that decides whether the session
 * happens at all.
 *
 * Voxu teaches the practice of showing up: what to set up, the first two
 * minutes, breathing, what to do when attention goes. It does NOT teach
 * technique — no squat depth, no pace targets, nothing medical — and the
 * note at the bottom says so rather than letting anyone assume the app
 * vetted their form.
 */
export function PracticeGuideSheet({
  presetKey,
  label,
  onClose,
}: {
  presetKey: string
  label: string
  onClose: () => void
}) {
  const domain = PRESETS_BY_KEY.get(presetKey)?.domain
  const guide = guideForDomain(domain)

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={guide.title}
    >
      <button className="flex-1" aria-label="Close" onClick={onClose} />
      <div
        className="rounded-t-3xl border-t border-white/15 bg-[#0b0b0b] px-5 pt-5 max-h-[88vh] overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">{label}</p>
            <h2 className="text-[26px] text-white leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>
              {guide.title}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 -mr-1 rounded-full bg-white/10 hover:bg-white/20 shrink-0">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <p className="text-sm text-white/60 leading-relaxed mt-2">{guide.why}</p>

        <ol className="mt-5 space-y-3.5">
          {guide.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full border border-white/20 text-[11px] text-white/60 flex items-center justify-center tabular-nums">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] text-white leading-snug">{step.label}</span>
                <span className="block text-[13px] text-white/55 mt-0.5 leading-snug">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-5 rounded-2xl bg-white/[0.04] border border-white/[0.12] p-4">
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/45">The one that matters</p>
          <p className="text-[16px] text-white/90 mt-1.5 leading-snug" style={SERIF}>{guide.keystone}</p>
        </div>

        <p className="text-[11px] text-white/35 mt-4 leading-relaxed">{GUIDE_LIMIT_NOTE}</p>
      </div>
    </div>
  )
}
