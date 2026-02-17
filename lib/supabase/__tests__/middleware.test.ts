import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @supabase/ssr before importing
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
  })),
}))

import { createServerClient } from '@supabase/ssr'
import { updateSession } from '../middleware'

function createMockRequest(pathname: string): any {
  const url = new URL(`http://localhost:3000${pathname}`)
  // Add clone() to match NextURL behavior
  ;(url as any).clone = () => new URL(url.toString())
  return {
    nextUrl: url,
    cookies: {
      getAll: vi.fn(() => []),
      set: vi.fn(),
    },
    headers: new Headers(),
  }
}

describe('updateSession middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function mockUser(user: any) {
    const mockGetUser = vi.fn().mockResolvedValue({ data: { user } })
    ;(createServerClient as any).mockReturnValue({
      auth: { getUser: mockGetUser },
    })
  }

  it('should allow API routes through without redirect', async () => {
    mockUser(null)
    const request = createMockRequest('/api/subscription')
    const response = await updateSession(request)
    expect(response.status).not.toBe(307)
  })

  it('should allow auth routes for unauthenticated users', async () => {
    mockUser(null)
    const request = createMockRequest('/login')
    const response = await updateSession(request)
    expect(response.status).not.toBe(307)
  })

  it('should allow public link routes', async () => {
    mockUser(null)
    for (const path of ['/report/abc', '/portal/xyz', '/invite/123']) {
      const request = createMockRequest(path)
      const response = await updateSession(request)
      expect(response.status).not.toBe(307)
    }
  })

  it('should redirect unauthenticated users from protected routes to login', async () => {
    mockUser(null)
    const request = createMockRequest('/jobs')
    const response = await updateSession(request)
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/login')
  })

  it('should allow authenticated users to access protected routes', async () => {
    mockUser({ id: 'user-1', email: 'test@test.com' })
    const request = createMockRequest('/jobs')
    const response = await updateSession(request)
    expect(response.status).not.toBe(307)
  })

  it('should allow authenticated users on auth pages (early return)', async () => {
    // Note: middleware returns early for auth routes before the authenticated redirect check
    mockUser({ id: 'user-1', email: 'test@test.com' })
    const request = createMockRequest('/login')
    const response = await updateSession(request)
    expect(response.status).not.toBe(307)
  })

  it('should allow unauthenticated users to access home page', async () => {
    mockUser(null)
    const request = createMockRequest('/')
    const response = await updateSession(request)
    expect(response.status).not.toBe(307)
  })

  it('should allow unauthenticated users to access dashboard pages', async () => {
    mockUser(null)
    const request = createMockRequest('/daily-guide')
    const response = await updateSession(request)
    expect(response.status).not.toBe(307)
  })
})
