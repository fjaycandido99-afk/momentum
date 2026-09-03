import { describe, it, expect, vi, beforeEach } from 'vitest'

const audioDeleteMany = vi.fn()
const usageDeleteMany = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    audioCache: { deleteMany: (...a: unknown[]) => audioDeleteMany(...a) },
    aiUsageDaily: { deleteMany: (...a: unknown[]) => usageDeleteMany(...a) },
  },
}))

const { cleanupChatVoiceCache, cleanupAiUsage, cleanupExpiredAudioCache } =
  await import('@/lib/daily-guide/cache-cleanup')

beforeEach(() => {
  audioDeleteMany.mockReset().mockResolvedValue({ count: 0 })
  usageDeleteMany.mockReset().mockResolvedValue({ count: 0 })
})

describe('cleanupChatVoiceCache', () => {
  it('only ever targets chat- keys', async () => {
    await cleanupChatVoiceCache()
    const where = audioDeleteMany.mock.calls[0][0].where
    expect(where.cache_key).toEqual({ startsWith: 'chat-' })
  })

  it('never touches the permanent voice library', async () => {
    // library-* entries are the pre-generated guided audio. Deleting one
    // silently costs real ElevenLabs credits to rebuild.
    await cleanupChatVoiceCache()
    const serialised = JSON.stringify(audioDeleteMany.mock.calls[0][0])
    expect(serialised).not.toContain('library-')
  })

  it('keeps chat audio far longer than guide audio, since replies repeat', async () => {
    await cleanupChatVoiceCache()
    const chatCutoff = audioDeleteMany.mock.calls[0][0].where.created_at.lt as Date
    audioDeleteMany.mockClear()
    await cleanupExpiredAudioCache()
    const guideCutoff = audioDeleteMany.mock.calls[0][0].where.AND[1].created_at.lt as Date
    expect(chatCutoff.getTime()).toBeLessThan(guideCutoff.getTime())
  })
})

describe('cleanupAiUsage', () => {
  it('compares the day key as a string, not a Date', async () => {
    // `day` is YYYY-MM-DD in the USER's timezone. Handing Prisma a Date
    // here would compare against a UTC instant and delete the wrong rows.
    await cleanupAiUsage()
    const lt = usageDeleteMany.mock.calls[0][0].where.day.lt
    expect(typeof lt).toBe('string')
    expect(lt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('retains more than a month so the free limits can be reviewed', async () => {
    await cleanupAiUsage()
    const lt = usageDeleteMany.mock.calls[0][0].where.day.lt as string
    const days = (Date.now() - new Date(lt).getTime()) / 86_400_000
    expect(days).toBeGreaterThan(30)
  })

  it('never deletes today', async () => {
    await cleanupAiUsage()
    const lt = usageDeleteMany.mock.calls[0][0].where.day.lt as string
    expect(lt < new Date().toISOString().slice(0, 10)).toBe(true)
  })
})
