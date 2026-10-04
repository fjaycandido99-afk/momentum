import { describe, it, expect } from 'vitest'
import { listPrices } from '@/lib/pricing'

describe('list prices', () => {
  it('shows today’s prices until the Apple change day, then the new ones', () => {
    expect(listPrices(new Date(2026, 9, 4, 23, 59))).toMatchObject({ monthly: 6.99, yearly: 49.99, yearlySave: 40 })
    expect(listPrices(new Date(2026, 9, 5, 0, 1))).toMatchObject({ monthly: 9.99, yearly: 79.99, yearlyPerMonth: '6.67', yearlySave: 33 })
  })
})
