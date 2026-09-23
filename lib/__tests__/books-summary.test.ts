import { describe, it, expect } from 'vitest'
import {
  buildSummaryPrompt,
  toSummary,
  validateSummary,
  type SummaryDraft,
} from '@/lib/books/summary'

const good: SummaryDraft = {
  about:
    'A book about small changes and the systems that carry them. It argues that what you repeat matters more than what you intend, and spends most of its length on how to make a habit easier to start than to skip.',
  forYourEra:
    'You are nine days into Discipline Era, which is the stretch where motivation stops helping. The idea worth taking from this book is that you should make the thing smaller, not try harder.',
  whileYouRead: 'Notice which of your own promises are hard because they are vague.',
}

describe('a summary that may be shown', () => {
  it('passes', () => {
    expect(validateSummary(good)).toBeNull()
  })

  it('does not require the optional third line', () => {
    expect(validateSummary({ about: good.about, forYourEra: good.forYourEra })).toBeNull()
  })

  it('drops the optional line rather than keeping it empty', () => {
    const out = toSummary({ ...good, whileYouRead: '   ' })
    expect(out.whileYouRead).toBeUndefined()
    expect(out.about).toBe(good.about!.trim())
  })
})

describe('the refusal that is a correct answer', () => {
  it('honours the model saying it does not know the book', () => {
    // A plausible summary of the wrong book is worse than no summary, so
    // this is surfaced as itself rather than retried into something.
    expect(validateSummary({ unknown: true })).toBe('UNKNOWN_BOOK')
  })

  it('honours it even when the model also filled the fields in', () => {
    expect(validateSummary({ ...good, unknown: true })).toBe('UNKNOWN_BOOK')
  })

  it('rejects an empty answer', () => {
    expect(validateSummary({})).toBe('EMPTY')
    expect(validateSummary({ about: 'Something.' })).toBe('EMPTY')
    expect(validateSummary({ about: '  ', forYourEra: 'x' })).toBe('EMPTY')
  })
})

describe('things the summary must never be', () => {
  it('refuses a replacement for the book', () => {
    // A chapter breakdown is a substitute for reading, which is the
    // opposite of what a reading practice is for.
    expect(validateSummary({ ...good, about: 'Chapter 1 covers the habit loop.' })).toBe('CHAPTER_RECAP')
    expect(validateSummary({ ...good, forYourEra: 'See part three for the systems idea.' })).toBe('CHAPTER_RECAP')
  })

  it('refuses to quote the author', () => {
    expect(
      validateSummary({
        ...good,
        about: 'Its thesis is "you do not rise to the level of your goals, you fall to the level of your systems" throughout.',
      }),
    ).toBe('QUOTED')
  })

  it('refuses to prescribe a dose', () => {
    // Their minimum is their own — the same rule the movement cues keep.
    expect(validateSummary({ ...good, whileYouRead: 'Read 20 pages a night to finish it.' })).toBe('PRESCRIPTION')
    expect(validateSummary({ ...good, forYourEra: 'Read two chapters each day.' })).toBe('PRESCRIPTION')
  })

  it('still allows a fact about the book that is not an instruction', () => {
    // "two chapters each day" is a prescription; "takes minutes a day" is a
    // description of the book. A digits-only rule missed the first, and a
    // rule with no quantity at all would have banned the second.
    expect(validateSummary({ ...good, about: 'Its examples take minutes a day rather than hours.' })).toBeNull()
    expect(validateSummary({ ...good, about: 'It is about pages and days and habits.' })).toBeNull()
  })

  it('refuses to claim it read the book', () => {
    expect(validateSummary({ ...good, about: 'I read this last year and loved it.' })).toBe('CLAIMS_TO_HAVE_READ')
    expect(validateSummary({ ...good, whileYouRead: 'My favourite part is the section on identity.' })).toBe('CLAIMS_TO_HAVE_READ')
  })

  it('refuses borrowed authority', () => {
    expect(validateSummary({ ...good, about: 'Studies show habits take 21 days.' })).toBe('EVIDENCE')
  })

  it('refuses a non-answer', () => {
    expect(validateSummary({ ...good, about: 'As an AI, I cannot summarise books.' })).toBe('NOT_AN_ANSWER')
  })

  it('refuses an essay', () => {
    expect(validateSummary({ ...good, about: 'a'.repeat(500) })).toBe('TOO_LONG')
    expect(validateSummary({ ...good, forYourEra: 'b'.repeat(400) })).toBe('TOO_LONG')
    expect(validateSummary({ ...good, whileYouRead: 'c'.repeat(300) })).toBe('TOO_LONG')
  })

  it('checks every field, not just the first', () => {
    // A rule enforced on `about` only would be no rule at all.
    for (const field of ['about', 'forYourEra', 'whileYouRead'] as const) {
      expect(validateSummary({ ...good, [field]: 'I read this one twice.' }), field).toBe('CLAIMS_TO_HAVE_READ')
    }
  })
})

describe('the prompt', () => {
  it('gives the model the book and the era', () => {
    const prompt = buildSummaryPrompt({
      title: 'Atomic Habits',
      author: 'James Clear',
      eraTitle: 'Discipline Era',
      eraDay: 9,
      eraIntent: 'stop starting over every Monday',
    })
    expect(prompt).toContain('Atomic Habits')
    expect(prompt).toContain('James Clear')
    expect(prompt).toContain('Discipline Era, day 9 of 30')
    expect(prompt).toContain('stop starting over every Monday')
  })

  it('tells the model not to invent an era when there is none', () => {
    // Otherwise "for your era" invents one, which is the app making up the
    // single most personal thing on the card.
    const prompt = buildSummaryPrompt({ title: 'Meditations', author: 'Marcus Aurelius' })
    expect(prompt).toMatch(/none right now/)
    expect(prompt).toMatch(/Do not invent one/)
  })

  it('leaves out what it was not given', () => {
    const prompt = buildSummaryPrompt({ title: 'Deep Work', author: 'Cal Newport', eraTitle: 'Locked In' })
    expect(prompt).toContain('Locked In')
    expect(prompt).not.toMatch(/day \d/)
    expect(prompt).not.toMatch(/trying to change/)
  })
})
