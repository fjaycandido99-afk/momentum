import { describe, it, expect } from 'vitest'
import { isCommand } from '@/lib/voice-guide/intents'
import { talkOpener } from '@/lib/voice-guide/scripts'

describe('talk it through', () => {
  it('treats only command-shaped words as commands', () => {
    expect(isCommand('Take me to my laws')).toBe(true)
    expect(isCommand('can you make today easier')).toBe(true)
    expect(isCommand('set this up for me')).toBe(true)
    expect(isCommand('play today\'s guided session')).toBe(true)
    // Conversation, even when it names a lesson topic or a place.
    expect(isCommand('I missed yesterday and I feel awful')).toBe(false)
    expect(isCommand('why don\'t I have any laws yet?')).toBe(false)
    expect(isCommand('I keep procrastinating')).toBe(false)
  })

  it('calls back to their day-one words from week three, with the real count', () => {
    const era = { title: 'Locked In', day: 15, change: 'stop getting distracted', kept: 11, answered: 14 }
    expect(talkOpener({ screen: 'era', era })).toBe(
      'Two weeks ago you told me you wanted to change this: "stop getting distracted". You\'ve kept 11 of the 14 promises you\'ve checked in on. Want to talk about how it\'s going?',
    )
  })

  it('stays plain before then, and never invents a count', () => {
    expect(talkOpener({ screen: 'era', era: { title: 'Locked In', day: 5, change: 'x', kept: 0, answered: 0 } }))
      .toBe('You\'re on day 5 of Locked In. What\'s on your mind about it?')
  })

  it('opens every other screen with a question, not a claim', () => {
    for (const screen of ['laws', 'psychology', 'profile', 'proof'] as const) {
      expect(talkOpener({ screen })).toMatch(/\?$/)
    }
    expect(talkOpener({ screen: 'lesson', lessonTitle: 'Small wins' })).toBe('Want to talk about how Small wins might apply to you?')
  })
})
