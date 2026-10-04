import { describe, it, expect } from 'vitest'
import { authorizedByHeader } from '@/lib/revenuecat-webhook-auth'

describe('RevenueCat webhook auth', () => {
  it("accepts the dashboard's Authorization value, raw or as Bearer", () => {
    expect(authorizedByHeader('s3cret-value', 's3cret-value')).toBe(true)
    expect(authorizedByHeader('Bearer s3cret-value', 's3cret-value')).toBe(true)
  })
  it('refuses anything else without throwing on length', () => {
    expect(authorizedByHeader('wrong', 's3cret-value')).toBe(false)
    expect(authorizedByHeader(null, 's3cret-value')).toBe(false)
    expect(authorizedByHeader('s3cret-value', '')).toBe(false)
  })
})
