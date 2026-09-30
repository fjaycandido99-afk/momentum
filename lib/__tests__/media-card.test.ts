import { describe, it, expect } from 'vitest'
import { splitTitle } from '@/components/home/MediaCard'

// The card's white title + blue second line come from the video's own title,
// split at its first separator — never an invented subtitle.
describe('media card title split', () => {
  it('splits at the first separator', () => {
    expect(splitTitle('Stop Getting Distracted | Motivational Video | Graded')).toEqual({
      main: 'Stop Getting Distracted',
      rest: 'Motivational Video | Graded',
    })
    expect(splitTitle('Cozy Cafe Shop - Chill Lofi Hip Hop Mix')).toEqual({
      main: 'Cozy Cafe Shop',
      rest: 'Chill Lofi Hip Hop Mix',
    })
  })

  it('leaves a title with no separator whole', () => {
    expect(splitTitle('DISTANCE YOURSELF FROM THE NOISE')).toEqual({ main: 'DISTANCE YOURSELF FROM THE NOISE', rest: null })
  })

  it('does not split hyphenated words', () => {
    expect(splitTitle('Lo-Fi Beats to Study')).toEqual({ main: 'Lo-Fi Beats to Study', rest: null })
  })
})
