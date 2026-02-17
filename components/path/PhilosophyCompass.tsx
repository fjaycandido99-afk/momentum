'use client'

import { useState } from 'react'
import type { MindsetId } from '@/lib/mindset/types'

interface CompassValue {
  name: string
  description: string
}

const COMPASS_DATA: Record<MindsetId, { icon: string; values: CompassValue[] }> = {
  stoic: {
    icon: '🛡️',
    values: [
      { name: 'Wisdom', description: 'See things clearly — understand what truly matters and what is illusion.' },
      { name: 'Courage', description: 'Act rightly even when fear, pain, or social pressure push against you.' },
      { name: 'Justice', description: 'Treat others fairly. Your duty to the whole is inseparable from your duty to yourself.' },
      { name: 'Temperance', description: 'Self-restraint in all things. Enough is a feast; excess is a prison.' },
    ],
  },
  existentialist: {
    icon: '🌀',
    values: [
      { name: 'Freedom', description: 'You are condemned to be free — every moment is a choice, and you cannot escape choosing.' },
      { name: 'Authenticity', description: 'Refuse to live by borrowed scripts. Your existence precedes your essence.' },
      { name: 'Responsibility', description: 'Owning your freedom means owning every consequence. No excuses.' },
      { name: 'Absurdity', description: 'The universe offers no meaning — and in that silence, you create your own.' },
    ],
  },
  cynic: {
    icon: '🔥',
    values: [
      { name: 'Self-sufficiency', description: 'Need nothing that the world can take away. True wealth is wanting less.' },
      { name: 'Honesty', description: 'Speak plainly. Social pleasantries are just another cage. Truth liberates.' },
      { name: 'Simplicity', description: 'Strip away the unnecessary. What remains when you remove everything fake?' },
      { name: 'Defiance', description: 'Convention is not truth. Question every rule society hands you.' },
    ],
  },
  hedonist: {
    icon: '🌿',
    values: [
      { name: 'Pleasure', description: 'Not excess, but the art of savoring — a meal, a friendship, a sunset, a breath.' },
      { name: 'Friendship', description: 'Of all things wisdom provides for a happy life, none is greater than friendship.' },
      { name: 'Tranquility', description: 'Ataraxia — freedom from anxiety. Peace is the highest pleasure.' },
      { name: 'Gratitude', description: 'The person who is grateful for what they have already possesses everything.' },
    ],
  },
  samurai: {
    icon: '⚔️',
    values: [
      { name: 'Honor', description: 'Your word is your bond. Reputation is built through deeds, not declarations.' },
      { name: 'Discipline', description: 'The warrior trains every day — not because it is easy, but because mastery demands it.' },
      { name: 'Courage', description: 'Face death each morning and you will never know cowardice in life.' },
      { name: 'Respect', description: 'Bow to your opponent. Strength without courtesy is merely violence.' },
      { name: 'Loyalty', description: 'Commit fully. Half-hearted devotion dishonors both you and your cause.' },
    ],
  },
  scholar: {
    icon: '🔮',
    values: [
      { name: 'Self-Knowledge', description: 'Know thyself — not the persona you present, but the depths you carry unseen.' },
      { name: 'Integration', description: 'The shadow is not your enemy. What you deny controls you; what you integrate empowers you.' },
      { name: 'Imagination', description: 'Myths, dreams, and symbols are the language of the unconscious — learn to read them.' },
      { name: 'Individuation', description: 'Become who you truly are, not who the world expects you to be. The Self transcends the ego.' },
    ],
  },
}

const ACCENT_COLORS: Record<MindsetId, { ring: string; node: string; text: string; glow: string }> = {
  stoic: { ring: 'rgba(148,163,184,0.3)', node: 'rgba(148,163,184,0.15)', text: 'text-slate-300', glow: 'rgba(148,163,184,0.1)' },
  existentialist: { ring: 'rgba(167,139,250,0.3)', node: 'rgba(167,139,250,0.15)', text: 'text-violet-300', glow: 'rgba(167,139,250,0.1)' },
  cynic: { ring: 'rgba(251,146,60,0.3)', node: 'rgba(251,146,60,0.15)', text: 'text-orange-300', glow: 'rgba(251,146,60,0.1)' },
  hedonist: { ring: 'rgba(52,211,153,0.3)', node: 'rgba(52,211,153,0.15)', text: 'text-emerald-300', glow: 'rgba(52,211,153,0.1)' },
  samurai: { ring: 'rgba(248,113,113,0.3)', node: 'rgba(248,113,113,0.15)', text: 'text-red-300', glow: 'rgba(248,113,113,0.1)' },
  scholar: { ring: 'rgba(147,197,253,0.3)', node: 'rgba(147,197,253,0.15)', text: 'text-blue-300', glow: 'rgba(147,197,253,0.1)' },
}

interface PhilosophyCompassProps {
  mindsetId: MindsetId
}

export function PhilosophyCompass({ mindsetId }: PhilosophyCompassProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const data = COMPASS_DATA[mindsetId]
  const colors = ACCENT_COLORS[mindsetId]
  const count = data.values.length
  const radius = 70 // radius for node placement
  const center = 100 // SVG center

  return (
    <div className="card-path p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="text-base">🧭</span>
        <h3 className="text-sm font-medium text-white">Philosophy Compass</h3>
      </div>

      <div className="flex justify-center mb-3">
        <svg width="200" height="200" viewBox="0 0 200 200" className="overflow-visible">
          {/* Outer ring */}
          <circle cx={center} cy={center} r={radius + 10} fill="none" stroke={colors.ring} strokeWidth="1" strokeDasharray="4 4" />

          {/* Connecting lines */}
          {data.values.map((_, i) => {
            const angle = (i * (360 / count) - 90) * (Math.PI / 180)
            const x = center + Math.cos(angle) * radius
            const y = center + Math.sin(angle) * radius
            return (
              <line
                key={`line-${i}`}
                x1={center} y1={center} x2={x} y2={y}
                stroke={selectedIndex === i ? colors.ring : 'rgba(255,255,255,0.08)'}
                strokeWidth="1"
                className="transition-all duration-300"
              />
            )
          })}

          {/* Center icon */}
          <circle cx={center} cy={center} r="18" fill={colors.node} stroke={colors.ring} strokeWidth="1" />
          <text x={center} y={center + 5} textAnchor="middle" fontSize="16">{data.icon}</text>

          {/* Value nodes */}
          {data.values.map((value, i) => {
            const angle = (i * (360 / count) - 90) * (Math.PI / 180)
            const x = center + Math.cos(angle) * radius
            const y = center + Math.sin(angle) * radius
            const isSelected = selectedIndex === i

            return (
              <g key={i} onClick={() => setSelectedIndex(isSelected ? null : i)} className="cursor-pointer">
                {/* Glow */}
                {isSelected && (
                  <circle cx={x} cy={y} r="24" fill={colors.glow} className="animate-[breathe_2s_ease-in-out_infinite]" />
                )}
                {/* Node circle */}
                <circle
                  cx={x} cy={y} r={isSelected ? 20 : 16}
                  fill={isSelected ? colors.node : 'rgba(255,255,255,0.05)'}
                  stroke={isSelected ? colors.ring : 'rgba(255,255,255,0.15)'}
                  strokeWidth="1"
                  className="transition-all duration-300"
                />
                {/* Label */}
                <text
                  x={x} y={y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isSelected ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.65)'}
                  fontSize="7"
                  fontWeight={isSelected ? '600' : '400'}
                  className="transition-all duration-300 select-none"
                >
                  {value.name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Description panel */}
      {selectedIndex !== null && (
        <div className="animate-fade-in p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
          <p className={`text-[13px] font-medium mb-1 ${colors.text}`}>{data.values[selectedIndex].name}</p>
          <p className="text-[12px] text-white/80 leading-relaxed">{data.values[selectedIndex].description}</p>
        </div>
      )}

      {selectedIndex === null && (
        <p className="text-center text-[11px] text-white/75">Tap a value to explore</p>
      )}
    </div>
  )
}
