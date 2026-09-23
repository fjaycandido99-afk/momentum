import { describe, it, expect } from 'vitest'
import {
  finishEstimate,
  pacePerDay,
  pagesLeft,
  percentRead,
  nextPageSample,
  progressLine,
  type BookState,
} from '@/lib/books/progress'

const day = (n: number) => new Date(2026, 8, n, 9, 0, 0)

/** Read 20 pages a day for five days, and the book's length is known. */
const reading: BookState = {
  pages: 320,
  currentPage: 140,
  currentPageAt: day(23),
  prevPage: 40,
  prevPageAt: day(18),
}

describe('how far in', () => {
  it('works out the percentage', () => {
    expect(percentRead(reading)).toBe(44)
    expect(pagesLeft(reading)).toBe(180)
  })

  it('has nothing to say without a total', () => {
    // The common case, not the edge: half of Open Library's results have no
    // page count. A percentage here would be invented.
    expect(percentRead({ ...reading, pages: null })).toBeNull()
    expect(pagesLeft({ ...reading, pages: null })).toBeNull()
  })

  it('has nothing to say before they tell us a page', () => {
    expect(percentRead({ ...reading, currentPage: null })).toBeNull()
    expect(pagesLeft({ ...reading, currentPage: null })).toBeNull()
  })

  it('caps at 100 instead of showing 104%', () => {
    // Happens for real: they count the index, or their edition differs from
    // the catalogue's.
    expect(percentRead({ ...reading, currentPage: 333 })).toBe(100)
    expect(pagesLeft({ ...reading, currentPage: 333 })).toBe(0)
  })

  it('refuses a nonsense total or page', () => {
    expect(percentRead({ pages: 0, currentPage: 10 })).toBeNull()
    expect(percentRead({ pages: 320, currentPage: -5 })).toBeNull()
  })
})

describe('pace, from readings they actually entered', () => {
  it('computes pages a day from the two points', () => {
    // 100 pages across 5 days.
    expect(pacePerDay(reading)).toBe(20)
  })

  it('will not call two readings on one afternoon a daily pace', () => {
    expect(pacePerDay({ ...reading, prevPageAt: day(23) })).toBeNull()
  })

  it('treats a page going backwards as no pace, not a negative one', () => {
    // They restarted the book, or mistyped. Either way it is not -20 a day.
    expect(pacePerDay({ ...reading, currentPage: 20 })).toBeNull()
  })

  it('needs both readings', () => {
    expect(pacePerDay({ ...reading, prevPage: null })).toBeNull()
    expect(pacePerDay({ ...reading, prevPageAt: null })).toBeNull()
  })

  it('declines to claim a pace slower than half a page a day', () => {
    // It would round to zero and imply a finish date decades out.
    expect(pacePerDay({ ...reading, currentPage: 41, prevPage: 40, prevPageAt: day(1) })).toBeNull()
  })
})

describe('when they would finish', () => {
  it('projects from the pace and the pages left', () => {
    const finish = finishEstimate(reading)
    expect(finish).not.toBeNull()
    expect(finish!.pace).toBe(20)
    expect(finish!.days).toBe(9) // 180 left at 20 a day
  })

  it('anchors to the last reading, not to today', () => {
    // If they last read a fortnight ago, the honest answer is what that
    // pace implied — not a date shoved forward by the time they have not
    // been reading.
    const finish = finishEstimate(reading)!
    const expected = new Date(day(23).getTime() + 9 * 86_400_000)
    expect(finish.date.toDateString()).toBe(expected.toDateString())
  })

  it('says nothing without a total, a page, or a pace', () => {
    expect(finishEstimate({ ...reading, pages: null })).toBeNull()
    expect(finishEstimate({ ...reading, currentPage: null })).toBeNull()
    expect(finishEstimate({ ...reading, prevPage: null })).toBeNull()
  })

  it('says nothing once the book is done', () => {
    expect(finishEstimate({ ...reading, currentPage: 320 })).toBeNull()
  })

  it('refuses an estimate more than a year out', () => {
    // Past a year the number stops being information and starts being a
    // comment on the reader.
    const crawling: BookState = {
      pages: 900,
      currentPage: 11,
      currentPageAt: day(23),
      prevPage: 10,
      prevPageAt: day(22),
    }
    expect(pacePerDay(crawling)).toBe(1)
    expect(finishEstimate(crawling)).toBeNull()
  })
})

describe('storing a new reading', () => {
  it('pushes the current reading back to previous', () => {
    const next = nextPageSample(reading, 200, day(25))
    expect(next.currentPage).toBe(200)
    expect(next.prevPage).toBe(140)
    expect(next.prevPageAt).toEqual(day(23))
  })

  it('treats a same-day change as an edit, not a new reading', () => {
    // Correcting a typo — "140, no, 148" — must not overwrite the real
    // earlier sample with one from ten seconds ago, which would leave the
    // pace computed over a ten-second window and thrown away.
    const next = nextPageSample(reading, 148, new Date(2026, 8, 23, 21, 0, 0))
    expect(next.currentPage).toBe(148)
    expect(next.prevPage).toBe(40)
    expect(next.prevPageAt).toEqual(day(18))
  })

  it('handles the very first reading', () => {
    const next = nextPageSample(
      { currentPage: null, currentPageAt: null, prevPage: null, prevPageAt: null },
      30,
      day(23),
    )
    expect(next).toEqual({ currentPage: 30, currentPageAt: day(23), prevPage: null, prevPageAt: null })
  })

  it('produces a state a pace can be read from', () => {
    // The round trip that matters: two readings a week apart give a pace.
    const first = nextPageSample({ currentPage: null, currentPageAt: null, prevPage: null, prevPageAt: null }, 0, day(16))
    const second = nextPageSample(first, 140, day(23))
    expect(pacePerDay({ ...second, pages: 320 })).toBe(20)
  })
})

describe('the line under the title', () => {
  it('shows page, total and percent when everything is known', () => {
    expect(progressLine(reading)).toBe('Page 140 of 320 · 44%')
  })

  it('shows their page alone when the total is unknown', () => {
    expect(progressLine({ ...reading, pages: null })).toBe('Page 140')
  })

  it('shows the length before they have started', () => {
    expect(progressLine({ ...reading, currentPage: null })).toBe('320 pages')
  })

  it('says nothing when it knows nothing', () => {
    expect(progressLine({ pages: null, currentPage: null, currentPageAt: null, prevPage: null, prevPageAt: null })).toBeNull()
  })

  it('marks the end without a percentage', () => {
    expect(progressLine({ ...reading, currentPage: 320 })).toBe("Page 320 of 320 — that's the lot")
  })
})
