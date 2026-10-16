import type { Section } from './store'

// What Voxu says in each chapter. The caption shows it and, with narration
// on, Voxu Voice speaks it (public/audio/becoming/<section>.mp3, generated
// once by scripts/becoming-narration.mjs from these exact lines; rerun it
// after editing a line). Claims stay within what the app does.
export const NARRATION: Record<Section, string> = {
  hero: 'You are not discovered. You are built. Five parts of one practice.',
  potential: 'Choose who you are becoming. Pick a thirty-day era, and work on one thing, a day at a time.',
  intention: 'Every night, an honest answer. I ask whether you kept today’s promise, and you tell me the truth.',
  discipline: 'A coach that remembers your word. Each morning, you make one promise. I answer it, and on the hard days I remind you what you said on day one.',
  strength: 'Motivation fades. Your word remains. One promise a day, thirty days in a row. Every day leaves a mark.',
  polish: 'Focus by day. Rest by night. Guided sessions, soundscapes and sleep audio come with the era you are in.',
  stoic: 'The Stoic. Calm about what you cannot control. Exact about what you can.',
  samurai: 'The Samurai. Discipline as a way of living. Quiet, exact, unhurried.',
  scholar: 'The Scholar. Understand it first. Then do the work, properly.',
  final: 'Becoming is not a destination. It is a practice. Start your era.',
}
