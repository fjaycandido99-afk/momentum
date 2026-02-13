'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { MindsetId } from '@/lib/mindset/types'

interface DeskObject {
  emoji: string
  name: string
  insight: string
}

interface DeskScene {
  title: string
  subtitle: string
  bg: string
  objects: DeskObject[]
}

const DESK_SCENES: Record<Exclude<MindsetId, 'scholar'>, DeskScene> = {
  stoic: {
    title: "Marcus's Study",
    subtitle: 'Rome, 170 AD — by lamplight',
    bg: 'from-stone-900/30 to-stone-950/50',
    objects: [
      {
        emoji: '📜',
        name: 'Scroll',
        insight: '"Write your thoughts. Examine your day. The unexamined life crumbles under the first storm."',
      },
      {
        emoji: '🪔',
        name: 'Oil Lamp',
        insight: '"The light of reason guides through any darkness. External light fades — inner light endures."',
      },
      {
        emoji: '⚖️',
        name: 'Scales',
        insight: '"Weigh each impression before accepting it. Not everything that appears urgent is important."',
      },
      {
        emoji: '✒️',
        name: 'Quill',
        insight: '"Letters to yourself are the highest form of self-mastery. The hand reveals what the mind conceals."',
      },
    ],
  },
  existentialist: {
    title: "Camus's Cafe",
    subtitle: 'Paris, 1942 — a corner table',
    bg: 'from-violet-950/20 to-stone-950/50',
    objects: [
      {
        emoji: '☕',
        name: 'Coffee',
        insight: '"Even in the mundane, we find the absurd beauty of existence. This cup — warm, bitter, real."',
      },
      {
        emoji: '📓',
        name: 'Notebook',
        insight: '"Write not to find answers, but to find better questions. The blank page mirrors the void."',
      },
      {
        emoji: '🚬',
        name: 'Cigarette',
        insight: '"Each breath is a choice to continue. We must imagine Sisyphus happy — and the smoker, present."',
      },
      {
        emoji: '🪟',
        name: 'Window',
        insight: '"The world outside asks nothing of you — that is its gift. And its terror. Look anyway."',
      },
    ],
  },
  cynic: {
    title: "Diogenes's Barrel",
    subtitle: 'Athens, 350 BC — under the sun',
    bg: 'from-orange-950/20 to-stone-950/50',
    objects: [
      {
        emoji: '🏺',
        name: 'Barrel',
        insight: '"Home is wherever you refuse to be enslaved. Four walls? Three is luxury. One is enough."',
      },
      {
        emoji: '🔦',
        name: 'Lantern',
        insight: '"I am looking for an honest person. In broad daylight, with a lantern. Still looking."',
      },
      {
        emoji: '🥣',
        name: 'Bowl',
        insight: '"Seeing a child drink from cupped hands, Diogenes threw away his bowl. One less thing to carry."',
      },
      {
        emoji: '☀️',
        name: 'Sunlight',
        insight: '"When Alexander offered anything he desired, Diogenes replied: Stand out of my sunlight. Freedom needs nothing."',
      },
    ],
  },
  hedonist: {
    title: "Epicurus's Garden",
    subtitle: 'Athens, 300 BC — among friends',
    bg: 'from-emerald-950/20 to-stone-950/50',
    objects: [
      {
        emoji: '🍷',
        name: 'Wine',
        insight: '"Not excess, but the simple pleasure shared with friends. One cup, savored, outweighs a barrel gulped."',
      },
      {
        emoji: '🫒',
        name: 'Olives',
        insight: '"Nature provides enough. Desire creates scarcity. The olive asks nothing and gives everything."',
      },
      {
        emoji: '💌',
        name: 'Letter',
        insight: '"Of all things wisdom provides for living a blessed life, friendship is by far the greatest."',
      },
      {
        emoji: '🌺',
        name: 'Flower',
        insight: '"The garden teaches: grow where you are planted. Beauty exists for those who notice."',
      },
    ],
  },
  samurai: {
    title: "Musashi's Dojo",
    subtitle: 'Kumamoto, 1645 — before dawn',
    bg: 'from-red-950/20 to-stone-950/50',
    objects: [
      {
        emoji: '⚔️',
        name: 'Katana',
        insight: '"The sword is an extension of the mind, not the arm. A dull mind wields a dull blade."',
      },
      {
        emoji: '🖌️',
        name: 'Brush',
        insight: '"Know the Way broadly, and you will see it in all things. The brush and the sword share one path."',
      },
      {
        emoji: '📕',
        name: 'Book of Five Rings',
        insight: '"Perceive that which cannot be seen with the eye. The Way is in training — every single day."',
      },
      {
        emoji: '🕯️',
        name: 'Candle',
        insight: '"In stillness before battle, the warrior finds clarity. The flame does not hurry to burn."',
      },
    ],
  },
}

interface MastersDeskProps {
  mindsetId: Exclude<MindsetId, 'scholar'>
}

export function MastersDesk({ mindsetId }: MastersDeskProps) {
  const [selectedObject, setSelectedObject] = useState<number | null>(null)
  const scene = DESK_SCENES[mindsetId]

  return (
    <div className="card-path p-5">
      <div className="mb-3">
        <h3 className="text-sm font-medium text-white">{scene.title}</h3>
        <p className="text-[11px] text-white/60 mt-0.5">{scene.subtitle}</p>
      </div>

      {/* Scene */}
      <div className={`relative rounded-xl bg-gradient-to-b ${scene.bg} border border-white/[0.08] p-6 mb-3 overflow-hidden`}>
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 bg-gradient-to-b from-white/[0.06] to-transparent rounded-full" />

        {/* Objects grid */}
        <div className="relative flex justify-around items-end min-h-[80px]">
          {scene.objects.map((obj, i) => (
            <button
              key={i}
              onClick={() => setSelectedObject(selectedObject === i ? null : i)}
              className={`flex flex-col items-center gap-1.5 transition-all duration-300 press-scale ${
                selectedObject === i ? 'scale-110' : 'hover:scale-105'
              }`}
            >
              <span
                className={`text-3xl transition-all duration-300 ${
                  selectedObject === i
                    ? 'animate-[breathe_2s_ease-in-out_infinite]'
                    : selectedObject !== null ? 'opacity-50' : 'opacity-90'
                }`}
              >
                {obj.emoji}
              </span>
              <span className={`text-[10px] transition-all duration-300 ${
                selectedObject === i ? 'text-white' : 'text-white/50'
              }`}>
                {obj.name}
              </span>
            </button>
          ))}
        </div>

        {/* Surface/shelf line */}
        <div className="absolute bottom-4 left-6 right-6 h-px bg-white/10" />
      </div>

      {/* Insight panel */}
      {selectedObject !== null ? (
        <div className="animate-fade-in p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] relative">
          <button
            onClick={() => setSelectedObject(null)}
            className="absolute top-2 right-2 press-scale"
          >
            <X className="w-3 h-3 text-white/30" />
          </button>
          <p className="text-[12px] text-white/80 leading-relaxed italic pr-4">
            {scene.objects[selectedObject].insight}
          </p>
        </div>
      ) : (
        <p className="text-center text-[11px] text-white/60">Tap an object to reveal its wisdom</p>
      )}
    </div>
  )
}
