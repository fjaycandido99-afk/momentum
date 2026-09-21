import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { DOMAIN_IMAGES, domainArt, domainArtAlt } from '@/lib/practices/domain-art'
import { DOMAINS } from '@/lib/practices/presets'

describe('domain art', () => {
  it('points only at files that are on disk', () => {
    for (const [domain, path] of Object.entries(DOMAIN_IMAGES)) {
      expect(path.startsWith('/'), `${domain}: ${path}`).toBe(true)
      expect(existsSync(join(process.cwd(), 'public', path)), `missing public${path}`).toBe(true)
    }
  })

  it('keys art by a real domain', () => {
    const known = new Set(DOMAINS.map(d => d.id))
    for (const domain of Object.keys(DOMAIN_IMAGES)) {
      expect(known.has(domain as never) || domain === 'custom', domain).toBe(true)
    }
  })

  it('shows nothing rather than a stand-in for a domain without art', () => {
    // An empty header is quieter than the wrong picture.
    const missing = DOMAINS.map(d => d.id).filter(id => !DOMAIN_IMAGES[id])
    for (const id of missing) expect(domainArt(id), id).toBeNull()
    expect(domainArt(undefined)).toBeNull()
  })

  it('describes the place, not a person doing the activity', () => {
    const alt = domainArtAlt('Reading')
    expect(alt).toMatch(/where it happens/)
    expect(alt).not.toMatch(/person|someone|man|woman/i)
  })
})
