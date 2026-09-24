import { describe, expect, it } from 'vitest'
import {
  GROUP_LABELS,
  STEP_IDEAS,
  groupedStepOptions,
  readingLabel,
  stepOptions,
} from '@/lib/routines/picker'
import { ROUTINE_LIMITS, ROUTINE_STEP_KINDS } from '@/lib/routines/steps'

const gym = { id: 'p-gym', label: 'Push Pull Legs', preset_key: 'gym_ppl' }
const reading = { id: 'p-read', label: 'Ten pages', preset_key: 'read_pages' }

describe('what the picker offers', () => {
  it('every app moment that does not need a second choice', () => {
    const app = stepOptions().filter(o => o.group === 'app').map(o => o.kind)
    // 'practice' is listed by name instead, and 'own' is the ideas.
    expect(app).toEqual(ROUTINE_STEP_KINDS.filter(k => k !== 'practice' && k !== 'own'))
  })

  it('their disciplines by the name they gave them', () => {
    const options = stepOptions({ practices: [gym] })
    const mine = options.find(o => o.id === 'practice:p-gym')
    // Not "A discipline" and then a second dropdown.
    expect(mine?.label).toBe('Push Pull Legs')
    expect(mine?.kind).toBe('practice')
    expect(mine?.ref).toBe('p-gym')
  })

  it('their book, when nothing else carries it', () => {
    const options = stepOptions({ book: { title: 'Atomic Habits', author: 'James Clear' } })
    const book = options.find(o => o.id === 'book')
    expect(book?.label).toBe('Read Atomic Habits')
    expect(book?.text).toBe('Read Atomic Habits')
    expect(book?.hint).toBe('James Clear')
  })

  it('and NOT when a reading discipline already does', () => {
    // Otherwise the same reading lands in the day twice and reminds them
    // about both.
    const options = stepOptions({ practices: [reading], book: { title: 'Atomic Habits' } })
    expect(options.some(o => o.id === 'book')).toBe(false)
    expect(options.some(o => o.id === 'practice:p-read')).toBe(true)
  })

  it('a short list of ideas, and a blank one', () => {
    const ideas = stepOptions().filter(o => o.group === 'ideas')
    expect(ideas).toHaveLength(STEP_IDEAS.length + 1)
    // Somebody whose step is "call my mum" should not have to pick an idea
    // and delete it first.
    const blank = ideas.find(o => o.id === 'blank')
    expect(blank?.text).toBe('')
    expect(blank?.kind).toBe('own')
  })

  it('nothing under "yours" for somebody with neither', () => {
    expect(stepOptions().some(o => o.group === 'yours')).toBe(false)
    expect(groupedStepOptions().map(s => s.group)).toEqual(['app', 'ideas'])
  })

  it('every option inserts something savable', () => {
    const options = stepOptions({ practices: [gym], book: { title: 'Atomic Habits' } })
    for (const option of options) {
      expect(option.label.length, option.id).toBeGreaterThan(0)
      expect(option.label.length, option.id).toBeLessThanOrEqual(ROUTINE_LIMITS.stepLabel)
      expect(option.text.length, option.id).toBeLessThanOrEqual(ROUTINE_LIMITS.stepLabel)
      // A discipline step must arrive knowing which one; anything else must
      // not claim a ref it has no right to.
      if (option.kind === 'practice') expect(option.ref, option.id).toBeTruthy()
      else expect(option.ref, option.id).toBeNull()
      // Only a step of their own carries words; the app's moments name
      // themselves.
      if (option.kind !== 'own') expect(option.text, option.id).toBe('')
    }
  })

  it('ids are unique, so the list can be keyed', () => {
    const ids = stepOptions({ practices: [gym, reading] }).map(o => o.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('groups are labelled', () => {
    for (const section of groupedStepOptions({ practices: [gym] })) {
      expect(section.label).toBe(GROUP_LABELS[section.group])
    }
  })
})

describe('the reading label', () => {
  it('fits a step name, cut at a word', () => {
    const long = 'The Subtle Art of Not Giving a Very Long Number of Things At All'
    const label = readingLabel(long)
    expect(label.length).toBeLessThanOrEqual(ROUTINE_LIMITS.stepLabel)
    // No ellipsis: a name they can finish typing, not the app quoting them
    // badly.
    expect(label).not.toContain('…')
    expect(label.endsWith(' ')).toBe(false)
  })

  it('leaves a short title alone', () => {
    expect(readingLabel('Dune')).toBe('Read Dune')
  })

  it('tidies whitespace', () => {
    expect(readingLabel('  Atomic   Habits ')).toBe('Read Atomic Habits')
  })
})
