import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ITEMS_BY_ID } from '@/lib/assessment/items'

/**
 * Covers the glue between the scoring maths and the database — the part that
 * has no tests in assessment.test.ts and is where the user-visible promises
 * actually live: don't ask twice in a day, don't trust the client, and use
 * the user's own calendar rather than the server's.
 */

type Row = {
  item_id: string
  axis: string
  direction: number
  score: number
  local_day: string
  created_at: Date
}

let rows: Row[] = []
const findMany = vi.fn(async () => rows)
const create = vi.fn(async () => ({}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    assessmentAnswer: {
      findMany: (...a: unknown[]) => findMany(...(a as [])),
      create: (...a: unknown[]) => create(...(a as [])),
    },
  },
}))

const { loadState, nextItemFor, recordAnswer, localDay } = await import('@/lib/assessment/service')

function row(item_id: string, daysAgo: number, score = 4, local_day = '2026-01-01'): Row {
  const item = ITEMS_BY_ID.get(item_id)!
  return {
    item_id,
    axis: item.axis,
    direction: item.direction,
    score,
    local_day,
    created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
  }
}

/** loadState reads rows newest-first, as the real query orders them. */
function newestFirst(list: Row[]) {
  return [...list].sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
}

beforeEach(() => {
  rows = []
  vi.clearAllMocks()
})

describe('localDay', () => {
  it('uses the user timezone, not the server', () => {
    // 06:00 UTC on the 2nd is still the 1st in Honolulu (UTC-10).
    const at = new Date('2026-03-02T06:00:00Z')
    expect(localDay('Pacific/Honolulu', at)).toBe('2026-03-01')
    expect(localDay('Europe/London', at)).toBe('2026-03-02')
  })

  it('falls back to UTC when no timezone is stored', () => {
    expect(localDay(null, new Date('2026-03-02T06:00:00Z'))).toBe('2026-03-02')
  })

  it('falls back rather than throwing on a nonsense timezone', () => {
    expect(localDay('Not/AZone', new Date('2026-03-02T06:00:00Z'))).toBe('2026-03-02')
  })
})

describe('loadState', () => {
  it('marks the day answered using the user calendar', async () => {
    const today = localDay('Pacific/Honolulu')
    rows = [row('ag01', 0, 4, today)]
    const state = await loadState('u1', 'Pacific/Honolulu')
    expect(state.answeredToday).toBe(true)
  })

  it('does not treat yesterday as today', async () => {
    rows = [row('ag01', 1, 4, '1999-01-01')]
    const state = await loadState('u1', 'Pacific/Honolulu')
    expect(state.answeredToday).toBe(false)
  })

  it('puts recent items on cooldown and leaves old ones off it', async () => {
    rows = newestFirst([row('ag01', 5), row('di01', 400)])
    const state = await loadState('u1', null)
    expect(state.onCooldown.has('ag01')).toBe(true)
    expect(state.onCooldown.has('di01')).toBe(false)
  })

  it('orders staleFirst by least recently answered', async () => {
    rows = newestFirst([row('ag01', 2), row('di01', 30), row('in01', 10)])
    const state = await loadState('u1', null)
    expect(state.staleFirst).toEqual(['di01', 'in01', 'ag01'])
  })

  it('ranks a re-answered item by its most recent answer, not its first', async () => {
    // di01 was answered long ago AND recently — it is not the stalest.
    rows = newestFirst([row('di01', 90), row('di01', 1), row('ag01', 30)])
    const state = await loadState('u1', null)
    expect(state.staleFirst[0]).toBe('ag01')
  })

  it('scores using the direction stored on the row', async () => {
    // ag01 is a -1 item: answering 5 pushes agency DOWN.
    rows = [row('ag01', 1, 5)]
    const state = await loadState('u1', null)
    expect(state.read.axes.agency).toBe(-2)
  })
})

describe('nextItemFor', () => {
  it('returns nothing once the day is answered — this is what stops the card and the popup both asking', async () => {
    rows = [row('ag01', 0, 4, localDay(null))]
    const state = await loadState('u1', null)
    expect(nextItemFor(state)).toBeNull()
  })

  it('offers an item on a fresh day', async () => {
    rows = [row('ag01', 3, 4, '1999-01-01')]
    const state = await loadState('u1', null)
    const item = nextItemFor(state)
    expect(item).not.toBeNull()
    expect(item!.id).not.toBe('ag01')
  })
})

describe('recordAnswer', () => {
  it('refuses an item id that is not ours', async () => {
    expect(await recordAnswer('u1', null, 'made-up', 3)).toBe(false)
    expect(create).not.toHaveBeenCalled()
  })

  it('refuses a score outside the scale', async () => {
    for (const bad of [0, 6, -1, 2.5, NaN]) {
      expect(await recordAnswer('u1', null, 'ag01', bad), `score ${bad}`).toBe(false)
    }
    expect(create).not.toHaveBeenCalled()
  })

  it('takes axis and direction from the bank, never from the caller', async () => {
    const ok = await recordAnswer('u1', 'Pacific/Honolulu', 'fa02', 5)
    expect(ok).toBe(true)
    const arg = create.mock.calls[0][0] as { data: Record<string, unknown> }
    // fa02 is a faith item loading -1; a client cannot claim otherwise.
    expect(arg.data.axis).toBe('faith')
    expect(arg.data.direction).toBe(-1)
    expect(arg.data.score).toBe(5)
    expect(arg.data.local_day).toBe(localDay('Pacific/Honolulu'))
  })
})
