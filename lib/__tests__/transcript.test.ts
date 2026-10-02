import { describe, it, expect } from 'vitest'
import { transcriptParagraphs } from '@/lib/voice/transcript'

describe('guide transcripts', () => {
  it('keeps every word, in order', () => {
    const text = 'Arrive here. Let your shoulders drop. Breathe in... one... two. Hold it. Let it go. Notice the stillness.'
    const paras = transcriptParagraphs(text)
    expect(paras.join(' ')).toBe(text)
  })

  it('breaks a long script into short paragraphs', () => {
    const text = 'One. Two. Three. Four. Five. Six. Seven.'
    expect(transcriptParagraphs(text)).toEqual(['One. Two. Three.', 'Four. Five. Six.', 'Seven.'])
  })

  it('never splits on a "..." pause', () => {
    const paras = transcriptParagraphs('Breathe in... Hold... And out. Again.')
    expect(paras).toEqual(['Breathe in... Hold... And out. Again.'])
  })

  it('keeps blank-line breaks the script already has', () => {
    expect(transcriptParagraphs('First part.\n\nSecond part.')).toEqual(['First part.', 'Second part.'])
  })

  it('is empty without a script', () => {
    expect(transcriptParagraphs('')).toEqual([])
    expect(transcriptParagraphs(null)).toEqual([])
  })
})
