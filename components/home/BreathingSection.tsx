'use client'

import { BREATHING_TECHNIQUES, type BreathingTechnique } from '@/lib/breathing-exercises'

function svgBg(svg: string) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

const S = 'rgba(255,255,255,'
const BREATH_PATTERNS: Record<string, React.CSSProperties> = {
  box: {
    backgroundImage: svgBg(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="208" fill="none">
      <g stroke="${S}0.4)" stroke-width="0.5">
        <line x1="0" y1="24" x2="160" y2="24"/><line x1="0" y1="48" x2="160" y2="48"/>
        <line x1="0" y1="72" x2="160" y2="72"/><line x1="0" y1="96" x2="160" y2="96"/>
        <line x1="0" y1="120" x2="160" y2="120"/><line x1="0" y1="144" x2="160" y2="144"/>
        <line x1="0" y1="168" x2="160" y2="168"/><line x1="0" y1="192" x2="160" y2="192"/>
        <line x1="20" y1="0" x2="20" y2="208"/><line x1="44" y1="0" x2="44" y2="208"/>
        <line x1="68" y1="0" x2="68" y2="208"/><line x1="92" y1="0" x2="92" y2="208"/>
        <line x1="116" y1="0" x2="116" y2="208"/><line x1="140" y1="0" x2="140" y2="208"/>
      </g>
      <g stroke="${S}0.8)" stroke-width="1">
        <rect x="20" y="34" width="120" height="120"/>
        <rect x="20" y="34" width="120" height="120" transform="rotate(15 80 94)" opacity="0.7"/>
        <rect x="20" y="34" width="120" height="120" transform="rotate(30 80 94)" opacity="0.5"/>
        <rect x="20" y="34" width="120" height="120" transform="rotate(45 80 94)" opacity="0.35"/>
      </g>
      <g stroke="${S}0.75)" stroke-width="0.8">
        <rect x="40" y="54" width="80" height="80"/>
        <rect x="55" y="69" width="50" height="50"/>
        <rect x="68" y="82" width="24" height="24"/>
      </g>
      <g stroke="${S}0.45)" stroke-width="0.5">
        <line x1="80" y1="34" x2="80" y2="154"/><line x1="20" y1="94" x2="140" y2="94"/>
        <line x1="20" y1="34" x2="140" y2="154"/><line x1="140" y1="34" x2="20" y2="154"/>
      </g>
      <circle cx="80" cy="94" r="4" fill="${S}0.9)" stroke="none"/>
      <g fill="${S}0.75)" stroke="none">
        <rect x="18" y="32" width="5" height="5"/><rect x="137" y="32" width="5" height="5"/>
        <rect x="18" y="151" width="5" height="5"/><rect x="137" y="151" width="5" height="5"/>
      </g>
    </svg>`),
    backgroundSize: 'cover', backgroundPosition: 'center',
  },
  478: {
    backgroundImage: svgBg(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="208" fill="none">
      <g stroke="${S}0.65)" stroke-width="1">
        <path d="M0,25 C25,10 55,40 80,25 S135,10 160,25"/>
        <path d="M0,50 C25,35 55,65 80,50 S135,35 160,50"/>
        <path d="M0,75 C25,60 55,90 80,75 S135,60 160,75"/>
        <path d="M0,100 C25,85 55,115 80,100 S135,85 160,100" stroke-width="1.5"/>
        <path d="M0,125 C25,110 55,140 80,125 S135,110 160,125"/>
        <path d="M0,150 C25,135 55,165 80,150 S135,135 160,150"/>
        <path d="M0,175 C25,160 55,190 80,175 S135,160 160,175" opacity="0.5"/>
      </g>
      <g stroke="${S}0.4)" stroke-width="0.5">
        <path d="M0,37 C30,22 60,52 90,37 S140,22 160,37"/>
        <path d="M0,87 C30,72 60,102 90,87 S140,72 160,87"/>
        <path d="M0,137 C30,122 60,152 90,137 S140,122 160,137"/>
        <path d="M0,62 C30,47 60,77 90,62 S140,47 160,62"/>
        <path d="M0,112 C30,97 60,127 90,112 S140,97 160,112"/>
        <path d="M0,162 C30,147 60,177 90,162 S140,147 160,162"/>
      </g>
      <g fill="${S}0.9)" stroke="none">
        <circle cx="80" cy="100" r="4"/>
        <circle cx="40" cy="50" r="2.5"/><circle cx="120" cy="50" r="2.5"/>
        <circle cx="40" cy="150" r="2"/><circle cx="120" cy="150" r="2"/>
      </g>
      <line x1="80" y1="10" x2="80" y2="190" stroke="${S}0.3)" stroke-width="0.5" stroke-dasharray="4 4"/>
    </svg>`),
    backgroundSize: 'cover', backgroundPosition: 'center',
  },
  wim: {
    backgroundImage: svgBg(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="208" fill="none">
      <g stroke="${S}0.8)" stroke-width="1.2">
        <path d="M80,90 L55,45 L70,55 L65,15"/>
        <path d="M80,90 L105,45 L90,55 L95,15"/>
        <path d="M80,90 L35,70 L48,80 L10,60"/>
        <path d="M80,90 L125,70 L112,80 L150,60"/>
        <path d="M80,90 L45,120 L55,108 L25,145"/>
        <path d="M80,90 L115,120 L105,108 L135,145"/>
        <path d="M80,90 L60,135 L72,120 L55,165" opacity="0.7"/>
        <path d="M80,90 L100,135 L88,120 L105,165" opacity="0.7"/>
        <path d="M80,90 L30,95 L40,88 L5,92" opacity="0.5"/>
        <path d="M80,90 L130,95 L120,88 L155,92" opacity="0.5"/>
      </g>
      <g stroke="${S}0.6)" stroke-width="0.8" fill="none">
        <circle cx="80" cy="90" r="22"/><circle cx="80" cy="90" r="14"/>
        <circle cx="80" cy="90" r="40" opacity="0.5"/>
        <circle cx="80" cy="90" r="55" opacity="0.3"/>
      </g>
      <circle cx="80" cy="90" r="5" fill="${S}1)" stroke="none"/>
      <g fill="${S}0.9)" stroke="none">
        <circle cx="65" cy="15" r="3"/><circle cx="95" cy="15" r="3"/>
        <circle cx="10" cy="60" r="2.5"/><circle cx="150" cy="60" r="2.5"/>
        <circle cx="25" cy="145" r="2"/><circle cx="135" cy="145" r="2"/>
        <circle cx="55" cy="165" r="1.5"/><circle cx="105" cy="165" r="1.5"/>
      </g>
    </svg>`),
    backgroundSize: 'cover', backgroundPosition: 'center',
  },
  coherent: {
    backgroundImage: svgBg(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="208" fill="none">
      <g stroke="${S}0.8)" stroke-width="1.5">
        <path d="M0,55 L35,55 L48,25 L58,85 L68,40 L78,70 L88,50 L95,55 L160,55"/>
      </g>
      <g stroke="${S}0.6)" stroke-width="1">
        <path d="M0,95 L35,95 L48,65 L58,125 L68,80 L78,110 L88,90 L95,95 L160,95"/>
        <path d="M0,135 L35,135 L48,105 L58,165 L68,120 L78,150 L88,130 L95,135 L160,135"/>
      </g>
      <g stroke="${S}0.4)" stroke-width="0.5">
        <path d="M0,75 L35,75 L48,45 L58,105 L68,60 L78,90 L88,70 L95,75 L160,75" opacity="0.6"/>
        <path d="M0,115 L35,115 L48,85 L58,145 L68,100 L78,130 L88,110 L95,115 L160,115" opacity="0.6"/>
        <path d="M0,155 L35,155 L48,125 L58,185 L68,140 L78,170 L88,150 L95,155 L160,155" opacity="0.4"/>
      </g>
      <line x1="0" y1="180" x2="160" y2="180" stroke="${S}0.4)" stroke-width="0.5"/>
      <g fill="${S}0.9)" stroke="none">
        <circle cx="15" cy="180" r="3.5"/><circle cx="35" cy="180" r="3.5"/>
        <circle cx="55" cy="180" r="3.5"/><circle cx="75" cy="180" r="3.5"/>
        <circle cx="95" cy="180" r="3.5"/><circle cx="115" cy="180" r="3.5"/>
        <circle cx="135" cy="180" r="3.5"/><circle cx="155" cy="180" r="3.5"/>
      </g>
      <circle cx="58" cy="85" r="5" fill="${S}0.8)" stroke="none"/>
      <g fill="${S}0.6)" stroke="none">
        <circle cx="58" cy="125" r="3"/><circle cx="58" cy="165" r="2"/>
      </g>
    </svg>`),
    backgroundSize: 'cover', backgroundPosition: 'center',
  },
}

interface BreathingSectionProps {
  onSelect: (technique: BreathingTechnique) => void
}

export function BreathingSection({ onSelect }: BreathingSectionProps) {
  return (
    <div className="mb-8 liquid-reveal section-fade-bg">
      <h2 className="text-lg font-semibold text-white px-6 mb-4 parallax-header">Breathwork</h2>
      <div className="flex gap-3 overflow-x-auto px-6 pb-4 scrollbar-hide">
        {BREATHING_TECHNIQUES.map((technique) => (
          <button
            key={technique.id}
            aria-label={`${technique.name} breathing exercise`}
            onClick={() => onSelect(technique)}
            className="shrink-0 press-scale"
          >
            <div className="relative w-40 h-52 rounded-2xl overflow-hidden flex flex-col bg-black border-2 border-white/[0.15]">
              <div className="absolute inset-0" style={BREATH_PATTERNS[technique.id] || {}} />

              <div className="relative z-10 flex-1 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-2 border-white/40 bg-black flex items-center justify-center">
                  <span className="text-xl font-bold text-white">{technique.icon}</span>
                </div>
              </div>

              <div className="relative z-10 bg-black backdrop-blur-xl px-3 py-3 border-t border-white/[0.08]">
                <span className="text-sm font-medium text-white block text-center">{technique.name}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
