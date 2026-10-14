import type { Section } from './store'

// What Voxu says in each chapter. The caption shows it and, with narration
// on, Voxu Voice speaks it (public/audio/becoming/<section>.mp3, generated
// once by scripts/becoming-narration.mjs from these exact lines; rerun it
// after editing a line). Claims stay within what the app does.
export const NARRATION: Record<Section, string> = {
  hero: 'You are not discovered. You are built.',
  potential: 'Nobody becomes someone overnight. Every change starts as an unfinished stone, and one decision.',
  intention: 'Start with one promise. Each morning, promise yourself one thing, small enough to keep.',
  discipline: 'Motivation fades. Your word remains. At night, I ask whether you kept it, and you answer honestly.',
  strength: 'Every day leaves a mark. Thirty days later, your record shows what you actually do.',
  polish: 'Become someone you can count on.',
  stoic: 'The Stoic. Calm about what you cannot control. Exact about what you can.',
  samurai: 'The Samurai. Discipline as a way of living. Quiet, exact, unhurried.',
  scholar: 'The Scholar. Understand it first. Then do the work, properly.',
  final: 'Becoming is not a destination. It is a practice. Start your era.',
}
