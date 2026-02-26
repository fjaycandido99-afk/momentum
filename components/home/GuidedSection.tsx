'use client'

import { Loader2 } from 'lucide-react'
import { EqBars } from '@/components/ui/EqBars'
import { FeatureHint } from '@/components/ui/FeatureHint'
import { VOICE_GUIDES } from './home-types'
import { SoftLockBadge } from '@/components/premium/SoftLock'
import type { FreemiumContentType } from '@/lib/subscription-constants'

function svgBg(svg: string) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

const S = 'rgba(255,255,255,' // shorthand prefix
const H = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="208" fill="none">` // svg header
const F = `</svg>` // svg footer

// Each guide split into 3 independent layers: shapes, lines, dots
// Each layer gets its own animation so elements move independently
const GUIDE_LAYERS: Record<string, { svg: string; cls: string; dur: string }[]> = {
  breathing: [
    { svg: `${H}<g stroke="${S}0.55)" stroke-width="1"><circle cx="80" cy="95" r="95"/><circle cx="80" cy="95" r="85"/><circle cx="80" cy="95" r="75"/></g><g stroke="${S}1)" stroke-width="1.5"><circle cx="80" cy="95" r="65"/><circle cx="80" cy="95" r="52"/><circle cx="80" cy="95" r="40"/><circle cx="80" cy="95" r="28"/><circle cx="80" cy="95" r="18"/></g>${F}`, cls: 'gl-active-breathe', dur: '28s' },
    { svg: `${H}<g stroke="${S}0.85)" stroke-width="1"><line x1="80" y1="0" x2="80" y2="208"/><line x1="0" y1="95" x2="160" y2="95"/><line x1="10" y1="10" x2="150" y2="180"/><line x1="150" y1="10" x2="10" y2="180"/><line x1="0" y1="50" x2="160" y2="140"/><line x1="160" y1="50" x2="0" y2="140"/><line x1="40" y1="0" x2="40" y2="208" opacity="1"/><line x1="120" y1="0" x2="120" y2="208" opacity="1"/><line x1="0" y1="50" x2="160" y2="50" opacity="0.7"/><line x1="0" y1="140" x2="160" y2="140" opacity="0.7"/></g>${F}`, cls: 'gl-active-spin', dur: '50s' },
    { svg: `${H}<g fill="${S}1)" stroke="none"><circle cx="80" cy="95" r="3"/><circle cx="80" cy="30" r="2"/><circle cx="80" cy="160" r="2"/><circle cx="15" cy="95" r="2"/><circle cx="145" cy="95" r="2"/><circle cx="35" cy="40" r="1.5"/><circle cx="125" cy="40" r="1.5"/><circle cx="35" cy="150" r="1.5"/><circle cx="125" cy="150" r="1.5"/></g>${F}`, cls: 'gl-active-float', dur: '22s' },
  ],
  affirmation: [
    { svg: `${H}<g stroke="${S}0.9)" stroke-width="1.5"><line x1="80" y1="0" x2="80" y2="208"/><line x1="0" y1="95" x2="160" y2="95"/><line x1="0" y1="0" x2="160" y2="208"/><line x1="160" y1="0" x2="0" y2="208"/><line x1="0" y1="48" x2="160" y2="160"/><line x1="160" y1="48" x2="0" y2="160"/><line x1="40" y1="0" x2="120" y2="208" opacity="0.85"/><line x1="120" y1="0" x2="40" y2="208" opacity="0.85"/><line x1="0" y1="140" x2="80" y2="0" opacity="0.7"/><line x1="160" y1="140" x2="80" y2="0" opacity="0.7"/><line x1="0" y1="60" x2="80" y2="208" opacity="0.7"/><line x1="160" y1="60" x2="80" y2="208" opacity="0.7"/></g>${F}`, cls: 'gl-active-spin', dur: '40s' },
    { svg: `${H}<g fill="${S}1)" stroke="none"><circle cx="80" cy="95" r="5"/><circle cx="30" cy="35" r="3"/><circle cx="130" cy="35" r="3"/><circle cx="30" cy="155" r="3"/><circle cx="130" cy="155" r="3"/><circle cx="10" cy="95" r="2.5"/><circle cx="150" cy="95" r="2.5"/><circle cx="80" cy="10" r="2.5"/><circle cx="80" cy="180" r="2.5"/></g>${F}`, cls: 'gl-active-spin-r', dur: '30s' },
    { svg: `${H}<g fill="${S}1)" stroke="none"><circle cx="55" cy="55" r="1.5"/><circle cx="105" cy="55" r="1.5"/><circle cx="55" cy="135" r="1.5"/><circle cx="105" cy="135" r="1.5"/><circle cx="20" cy="68" r="1"/><circle cx="140" cy="68" r="1"/><circle cx="20" cy="122" r="1"/><circle cx="140" cy="122" r="1"/></g><polygon points="77,85 80,75 83,85 80,82" fill="${S}1)" stroke="none"/><polygon points="77,105 80,115 83,105 80,108" fill="${S}1)" stroke="none"/>${F}`, cls: 'gl-active-orbit', dur: '26s' },
  ],
  gratitude: [
    { svg: `${H}<g stroke="${S}0.95)" stroke-width="1.5"><circle cx="80" cy="90" r="32"/><circle cx="80" cy="58" r="32"/><circle cx="80" cy="122" r="32"/><circle cx="52" cy="74" r="32"/><circle cx="108" cy="74" r="32"/><circle cx="52" cy="106" r="32"/><circle cx="108" cy="106" r="32"/></g>${F}`, cls: 'gl-active-expand', dur: '32s' },
    { svg: `${H}<g stroke="${S}0.7)" stroke-width="1"><circle cx="80" cy="38" r="32"/><circle cx="80" cy="142" r="32"/><circle cx="30" cy="60" r="32"/><circle cx="130" cy="60" r="32"/><circle cx="30" cy="120" r="32"/><circle cx="130" cy="120" r="32"/></g><circle cx="80" cy="90" r="10" stroke="${S}1)" stroke-width="1.5" fill="none"/>${F}`, cls: 'gl-active-orbit', dur: '38s' },
    { svg: `${H}<g fill="${S}1)" stroke="none"><circle cx="80" cy="90" r="3"/><circle cx="80" cy="26" r="2.5"/><circle cx="80" cy="154" r="2.5"/><circle cx="20" cy="55" r="2"/><circle cx="140" cy="55" r="2"/><circle cx="20" cy="125" r="2"/><circle cx="140" cy="125" r="2"/><circle cx="52" cy="42" r="1.5"/><circle cx="108" cy="42" r="1.5"/><circle cx="52" cy="138" r="1.5"/><circle cx="108" cy="138" r="1.5"/></g>${F}`, cls: 'gl-active-pulse', dur: '14s' },
  ],
  sleep: [
    { svg: `${H}<circle cx="95" cy="60" r="35" stroke="${S}1)" stroke-width="1"/><circle cx="115" cy="48" r="30" fill="black" stroke="black" stroke-width="3"/><g fill="${S}1)" stroke="none"><circle cx="25" cy="25" r="2"/><circle cx="50" cy="15" r="1.5"/><circle cx="15" cy="50" r="1.5"/><circle cx="140" cy="20" r="2"/><circle cx="155" cy="45" r="1"/><circle cx="130" cy="35" r="1"/><circle cx="40" cy="75" r="1.2"/><circle cx="60" cy="40" r="1"/><circle cx="145" cy="80" r="1.5"/><circle cx="10" cy="90" r="1"/><circle cx="70" cy="25" r="0.8"/><circle cx="20" cy="70" r="0.8"/></g><polygon points="25,25 26.5,21 28,25 26.5,23.5" fill="${S}1)" stroke="none"/><polygon points="140,20 141.5,16 143,20 141.5,18.5" fill="${S}1)" stroke="none"/>${F}`, cls: 'gl-active-float', dur: '36s' },
    { svg: `${H}<g stroke="${S}0.8)" stroke-width="1.5"><line x1="15" y1="105" x2="145" y2="105"/><line x1="20" y1="115" x2="140" y2="115"/><line x1="25" y1="125" x2="135" y2="125"/><line x1="35" y1="135" x2="125" y2="135"/><line x1="45" y1="145" x2="115" y2="145"/><line x1="55" y1="155" x2="105" y2="155"/><line x1="60" y1="165" x2="100" y2="165"/></g>${F}`, cls: 'gl-active-wave', dur: '28s' },
    { svg: `${H}<g stroke="${S}0.55)" stroke-width="1"><path d="M15,105 Q80,90 145,105" fill="none"/><path d="M25,125 Q80,110 135,125" fill="none"/><path d="M45,145 Q80,135 115,145" fill="none"/></g>${F}`, cls: 'gl-active-breathe', dur: '20s' },
  ],
  anxiety: [
    { svg: `${H}<g stroke="${S}1)" stroke-width="1"><polygon points="80,15 145,115 15,115"/><polygon points="80,35 130,105 30,105" opacity="1"/><polygon points="80,55 115,100 45,100" opacity="0.85"/><polygon points="80,70 100,95 60,95" opacity="0.7"/></g>${F}`, cls: 'gl-active-breathe', dur: '22s' },
    { svg: `${H}<g stroke="${S}0.8)" stroke-width="1"><line x1="80" y1="15" x2="80" y2="115"/><line x1="15" y1="115" x2="145" y2="115"/><line x1="47" y1="65" x2="113" y2="65"/><line x1="80" y1="15" x2="47" y2="65" opacity="0.7"/><line x1="80" y1="15" x2="113" y2="65" opacity="0.7"/></g><g stroke="${S}0.7)" stroke-width="1.2"><line x1="10" y1="125" x2="150" y2="125"/><line x1="10" y1="135" x2="150" y2="135"/><line x1="10" y1="145" x2="150" y2="145"/><line x1="10" y1="155" x2="150" y2="155"/><line x1="10" y1="165" x2="150" y2="165"/><line x1="10" y1="175" x2="150" y2="175"/><line x1="30" y1="120" x2="30" y2="180" opacity="0.85"/><line x1="55" y1="120" x2="55" y2="180" opacity="0.85"/><line x1="80" y1="115" x2="80" y2="180"/><line x1="105" y1="120" x2="105" y2="180" opacity="0.85"/><line x1="130" y1="120" x2="130" y2="180" opacity="0.85"/></g>${F}`, cls: 'gl-active-wave', dur: '30s' },
    { svg: `${H}<circle cx="80" cy="80" r="8" stroke="${S}1)" stroke-width="1.2" fill="none"/><circle cx="80" cy="80" r="3" fill="${S}1)" stroke="none"/><g fill="${S}0.9)" stroke="none"><circle cx="30" cy="140" r="1.5"/><circle cx="55" cy="150" r="1.5"/><circle cx="105" cy="140" r="1.5"/><circle cx="130" cy="150" r="1.5"/></g>${F}`, cls: 'gl-active-pulse', dur: '10s' },
  ],
  stress_relief: [
    { svg: `${H}<g stroke="${S}0.9)" stroke-width="1.5"><path d="M0,30 Q40,10 80,30 T160,30"/><path d="M0,55 Q40,35 80,55 T160,55"/><path d="M0,80 Q40,60 80,80 T160,80"/><path d="M0,105 Q40,85 80,105 T160,105"/><path d="M0,130 Q40,110 80,130 T160,130"/><path d="M0,155 Q40,135 80,155 T160,155"/><path d="M0,180 Q40,160 80,180 T160,180" opacity="1"/></g><g stroke="${S}0.65)" stroke-width="1"><path d="M0,42 Q50,22 100,42 T160,42" opacity="0.85"/><path d="M0,92 Q50,72 100,92 T160,92" opacity="0.85"/><path d="M0,142 Q50,122 100,142 T160,142" opacity="0.85"/></g>${F}`, cls: 'gl-active-wave', dur: '26s' },
    { svg: `${H}<g stroke="${S}0.85)" stroke-width="1.5" fill="none"><circle cx="35" cy="55" r="18"/><circle cx="125" cy="80" r="15"/><circle cx="70" cy="130" r="12"/><circle cx="100" cy="40" r="10"/><circle cx="45" cy="160" r="8"/><circle cx="140" cy="150" r="7"/></g>${F}`, cls: 'gl-active-orbit', dur: '32s' },
    { svg: `${H}<g fill="${S}1)" stroke="none"><circle cx="35" cy="55" r="2.5"/><circle cx="125" cy="80" r="2"/><circle cx="70" cy="130" r="2"/><circle cx="100" cy="40" r="1.5"/></g>${F}`, cls: 'gl-active-float', dur: '20s' },
  ],
  focus_meditation: [
    { svg: `${H}<g stroke="${S}0.65)" stroke-width="1"><line x1="0" y1="20" x2="160" y2="20"/><line x1="0" y1="40" x2="160" y2="40"/><line x1="0" y1="60" x2="160" y2="60"/><line x1="0" y1="80" x2="160" y2="80"/><line x1="0" y1="100" x2="160" y2="100"/><line x1="0" y1="120" x2="160" y2="120"/><line x1="0" y1="140" x2="160" y2="140"/><line x1="0" y1="160" x2="160" y2="160"/><line x1="0" y1="180" x2="160" y2="180"/><line x1="20" y1="0" x2="20" y2="208"/><line x1="40" y1="0" x2="40" y2="208"/><line x1="60" y1="0" x2="60" y2="208"/><line x1="80" y1="0" x2="80" y2="208"/><line x1="100" y1="0" x2="100" y2="208"/><line x1="120" y1="0" x2="120" y2="208"/><line x1="140" y1="0" x2="140" y2="208"/></g>${F}`, cls: 'gl-active-spin', dur: '55s' },
    { svg: `${H}<g stroke="${S}1)" stroke-width="1"><rect x="15" y="25" width="130" height="130"/><rect x="35" y="45" width="90" height="90"/><rect x="55" y="65" width="50" height="50"/></g><line x1="80" y1="0" x2="80" y2="208" stroke="${S}1)" stroke-width="1"/><line x1="0" y1="90" x2="160" y2="90" stroke="${S}1)" stroke-width="1"/><g fill="${S}0.9)" stroke="none"><rect x="78" y="33" width="4" height="4"/><rect x="78" y="143" width="4" height="4"/><rect x="23" y="88" width="4" height="4"/><rect x="133" y="88" width="4" height="4"/></g>${F}`, cls: 'gl-active-breathe', dur: '24s' },
    { svg: `${H}<g stroke="${S}0.95)" stroke-width="1.5" fill="none"><circle cx="80" cy="90" r="55"/><circle cx="80" cy="90" r="40"/><circle cx="80" cy="90" r="25"/><circle cx="80" cy="90" r="12"/></g><circle cx="80" cy="90" r="4" fill="${S}1)" stroke="none"/>${F}`, cls: 'gl-active-spin-r', dur: '40s' },
  ],
  self_compassion: [
    { svg: `${H}<g stroke="${S}0.85)" stroke-width="1.5"><circle cx="50" cy="55" r="40"/><circle cx="110" cy="65" r="35"/><circle cx="80" cy="110" r="42"/><circle cx="35" cy="130" r="30"/><circle cx="125" cy="125" r="28"/><circle cx="65" cy="45" r="22"/></g>${F}`, cls: 'gl-active-orbit', dur: '30s' },
    { svg: `${H}<g stroke="${S}0.85)" stroke-width="1.5"><circle cx="105" cy="155" r="20"/><circle cx="25" cy="75" r="18"/><circle cx="140" cy="45" r="15"/><circle cx="80" cy="75" r="12"/><circle cx="50" cy="170" r="14"/><circle cx="130" cy="170" r="10"/></g><g stroke="${S}0.55)" stroke-width="1"><circle cx="50" cy="55" r="50"/><circle cx="110" cy="65" r="45"/><circle cx="80" cy="110" r="52"/></g>${F}`, cls: 'gl-active-expand', dur: '26s' },
    { svg: `${H}<g fill="${S}1)" stroke="none"><circle cx="50" cy="55" r="4"/><circle cx="110" cy="65" r="3.5"/><circle cx="80" cy="110" r="4"/><circle cx="35" cy="130" r="3"/><circle cx="125" cy="125" r="2.5"/><circle cx="80" cy="75" r="2"/></g>${F}`, cls: 'gl-active-float', dur: '22s' },
  ],
  confidence: [
    { svg: `${H}<g stroke="${S}1)" stroke-width="1.5"><polyline points="20,180 80,135 140,180"/><polyline points="20,155 80,110 140,155"/><polyline points="25,130 80,88 135,130"/><polyline points="30,108 80,70 130,108" opacity="1"/><polyline points="40,88 80,55 120,88" opacity="0.9"/><polyline points="50,72 80,44 110,72" opacity="1"/><polyline points="58,58 80,36 102,58" opacity="0.7"/></g>${F}`, cls: 'gl-active-breathe', dur: '26s' },
    { svg: `${H}<line x1="80" y1="36" x2="80" y2="10" stroke="${S}1)" stroke-width="2"/><polygon points="74,14 80,2 86,14" fill="${S}1)" stroke="none"/><g stroke="${S}0.65)" stroke-width="1"><line x1="80" y1="0" x2="80" y2="208"/><line x1="0" y1="135" x2="160" y2="135"/><line x1="50" y1="0" x2="50" y2="208" opacity="1"/><line x1="110" y1="0" x2="110" y2="208" opacity="1"/></g>${F}`, cls: 'gl-active-spin', dur: '45s' },
    { svg: `${H}<circle cx="80" cy="100" r="6" stroke="${S}0.95)" stroke-width="1" fill="none"/><circle cx="80" cy="100" r="2.5" fill="${S}1)" stroke="none"/><g fill="${S}0.9)" stroke="none"><circle cx="25" cy="170" r="2"/><circle cx="135" cy="170" r="2"/><circle cx="35" cy="145" r="1.5"/><circle cx="125" cy="145" r="1.5"/></g>${F}`, cls: 'gl-active-float', dur: '18s' },
  ],
}

// Overlay effect config (shown on top when playing)
const GUIDE_OVERLAY: Record<string, { cls: string; dur: string; style: React.CSSProperties }> = {
  breathing: {
    cls: 'gl-active-overlay-ring',
    dur: '15s',
    style: { background: 'radial-gradient(circle at 50% 45%, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 30%, transparent 55%)' },
  },
  affirmation: {
    cls: 'gl-active-overlay-sweep',
    dur: '16s',
    style: { background: 'conic-gradient(from 0deg at 50% 45%, transparent 0deg, rgba(255,255,255,0.25) 30deg, transparent 60deg)' },
  },
  gratitude: {
    cls: 'gl-active-overlay-ring',
    dur: '18s',
    style: { background: 'radial-gradient(circle at 50% 43%, rgba(255,255,255,0.3) 0%, transparent 40%)' },
  },
  sleep: {
    cls: 'gl-active-overlay-pulse',
    dur: '12s',
    style: { background: 'radial-gradient(circle at 25% 18%, rgba(255,255,255,0.35) 0%, transparent 10%), radial-gradient(circle at 72% 12%, rgba(255,255,255,0.25) 0%, transparent 8%), radial-gradient(circle at 88% 38%, rgba(255,255,255,0.2) 0%, transparent 7%), radial-gradient(circle at 12% 42%, rgba(255,255,255,0.18) 0%, transparent 9%)' },
  },
  anxiety: {
    cls: 'gl-active-overlay-scan',
    dur: '14s',
    style: { background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.2) 44%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.2) 56%, transparent 100%)' },
  },
  stress_relief: {
    cls: 'gl-active-overlay-ring',
    dur: '18s',
    style: { background: 'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.25) 0%, transparent 45%)' },
  },
  focus_meditation: {
    cls: 'gl-active-overlay-ring',
    dur: '12s',
    style: { background: 'radial-gradient(circle at 50% 43%, rgba(255,255,255,0.25) 0%, transparent 30%)' },
  },
  self_compassion: {
    cls: 'gl-active-overlay-ring',
    dur: '16s',
    style: { background: 'radial-gradient(circle at 50% 45%, rgba(255,255,255,0.3) 0%, transparent 35%)' },
  },
  confidence: {
    cls: 'gl-active-overlay-rise',
    dur: '14s',
    style: { background: 'linear-gradient(0deg, transparent 0%, rgba(255,255,255,0.25) 30%, rgba(255,255,255,0.35) 50%, transparent 65%)' },
  },
}

interface GuidedSectionProps {
  guideLabel: string | null
  guideIsPlaying: boolean
  loadingGuide: string | null
  isContentFree: (type: FreemiumContentType, id: number | string) => boolean
  onPlay: (guideId: string, name: string, isLocked: boolean) => void
}

export function GuidedSection({ guideLabel, guideIsPlaying, loadingGuide, isContentFree, onPlay }: GuidedSectionProps) {
  return (
    <div className="mb-10 liquid-reveal section-fade-bg">
      <div className="flex items-center justify-between px-6 mb-5">
        <div className="flex items-center gap-2.5 section-header">
          <div>
            <h2 className="section-header-title parallax-header">Guided</h2>
            <p className="section-header-subtitle">Voice-led sessions for mind & body</p>
          </div>
        </div>
      </div>
      <div className="px-6"><FeatureHint id="home-guided" text="Voice-guided sessions for breathing, gratitude & sleep" mode="once" /></div>
      <div className="flex gap-4 overflow-x-auto px-6 pb-3 scrollbar-hide snap-row">
        {VOICE_GUIDES.map((guide, index) => {
          const Icon = guide.icon
          const isLoading = loadingGuide === guide.id
          const isGuideActive = guideLabel === guide.name && guideIsPlaying
          const isLocked = !isContentFree('voiceGuide', guide.id)

          return (
            <button
              key={guide.id}
              aria-label={`${guide.name} guide${isGuideActive ? ' (playing)' : isLoading ? ' (loading)' : ''}${isLocked ? ' (premium)' : ''}`}
              onClick={() => onPlay(guide.id, guide.name, isLocked)}
              disabled={isLoading}
              className="shrink-0 press-scale snap-card card-stagger"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div
                className={`relative w-40 h-52 rounded-2xl overflow-hidden flex flex-col bg-black border border-white/[0.14] ${isGuideActive ? 'breathing-glow' : ''}`}
              >
                {/* Independent SVG layers — each animates differently when playing */}
                {(GUIDE_LAYERS[guide.id] || []).map((layer, i) => (
                  <div
                    key={i}
                    className={`absolute inset-0 ${isGuideActive ? layer.cls : ''}`}
                    style={{
                      backgroundImage: svgBg(layer.svg),
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      '--gl-t': layer.dur,
                    } as React.CSSProperties}
                  />
                ))}

                {/* Overlay glow effect (only when playing) */}
                {isGuideActive && GUIDE_OVERLAY[guide.id] && (
                  <div
                    className={`absolute inset-0 pointer-events-none guide-overlay-layer ${GUIDE_OVERLAY[guide.id].cls}`}
                    style={{
                      ...GUIDE_OVERLAY[guide.id].style,
                      '--gl-t': GUIDE_OVERLAY[guide.id].dur,
                    } as React.CSSProperties}
                  />
                )}

                {isLocked && !isGuideActive && !isLoading && (
                  <SoftLockBadge isLocked={true} size="sm" className="top-2 right-2" />
                )}

                <div className="relative z-10 flex-1 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-2 border-white/40 bg-black flex items-center justify-center">
                    {isLoading ? (
                      <Loader2 className="w-7 h-7 text-white animate-spin" />
                    ) : isGuideActive ? (
                      <EqBars />
                    ) : (
                      <Icon className="w-7 h-7 text-white" strokeWidth={1.5} />
                    )}
                  </div>
                </div>

                <div className="relative z-10 bg-black/80 px-3 py-3 border-t border-white/[0.06]">
                  <span className="text-sm font-medium text-white block text-center">{guide.name}</span>
                </div>
              </div>
            </button>
          )
        })}

      </div>
    </div>
  )
}
