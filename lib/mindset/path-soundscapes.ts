import type { MindsetId } from './types'

export interface PathSoundscape {
  id: string
  word: string
  youtubeId: string
  color: string
}

export const PATH_SOUNDSCAPES: Record<Exclude<MindsetId, 'scholar'>, PathSoundscape[]> = {
  stoic: [
    { id: 'focus', word: 'Focus', youtubeId: 'mPZkdNFkNps', color: 'from-slate-500/[0.08] to-zinc-500/[0.04]' },
    { id: 'fire', word: 'Fire', youtubeId: 'UgHKb_7884o', color: 'from-orange-500/[0.08] to-amber-500/[0.04]' },
    { id: 'stream', word: 'Stream', youtubeId: 'IvjMgVS6kng', color: 'from-blue-500/[0.08] to-cyan-500/[0.04]' },
  ],
  existentialist: [
    { id: 'night', word: 'Night', youtubeId: 'NgHhs3B1xnc', color: 'from-indigo-500/[0.08] to-violet-500/[0.04]' },
    { id: 'wind', word: 'Wind', youtubeId: '2dDuMb8XWTA', color: 'from-gray-500/[0.08] to-slate-500/[0.04]' },
    { id: 'ocean', word: 'Ocean', youtubeId: 'WHPEKLQID4U', color: 'from-teal-500/[0.08] to-cyan-500/[0.04]' },
  ],
  cynic: [
    { id: 'thunder', word: 'Thunder', youtubeId: 'nDq6TstdEi8', color: 'from-yellow-500/[0.08] to-amber-500/[0.04]' },
    { id: 'forest', word: 'Forest', youtubeId: 'xNN7iTA57jM', color: 'from-green-500/[0.08] to-emerald-500/[0.04]' },
    { id: 'fire', word: 'Fire', youtubeId: 'UgHKb_7884o', color: 'from-orange-500/[0.08] to-red-500/[0.04]' },
  ],
  hedonist: [
    { id: 'rain', word: 'Rain', youtubeId: 'mPZkdNFkNps', color: 'from-blue-500/[0.08] to-indigo-500/[0.04]' },
    { id: 'stream', word: 'Stream', youtubeId: 'IvjMgVS6kng', color: 'from-emerald-500/[0.08] to-teal-500/[0.04]' },
    { id: 'piano', word: 'Piano', youtubeId: '77ZozI0rw7w', color: 'from-rose-500/[0.08] to-pink-500/[0.04]' },
  ],
  samurai: [
    { id: 'forest', word: 'Forest', youtubeId: 'xNN7iTA57jM', color: 'from-green-500/[0.08] to-emerald-500/[0.04]' },
    { id: 'night', word: 'Night', youtubeId: 'NgHhs3B1xnc', color: 'from-indigo-500/[0.08] to-violet-500/[0.04]' },
    { id: 'wind', word: 'Wind', youtubeId: '2dDuMb8XWTA', color: 'from-gray-500/[0.08] to-slate-500/[0.04]' },
  ],
}
