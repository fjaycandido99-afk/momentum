import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// The outage this guards against: Groq retired llama-3.1-8b-instant, every
// call 404'd for seventeen days, and the "resilient" wrapper never tried
// anything else — a 404 was classed permanent, and the fallback model was
// the same dead model. Both halves are asserted here.

// Mock prisma. Without this the telemetry insert inside createChatCompletion
// hits the REAL database — this test wrote fake primary-model rows into
// production AiCallLog, polluting the exact table being used to diagnose a
// live outage.
vi.mock('@/lib/prisma', () => ({
  prisma: {
    aiCallLog: {
      create: vi.fn().mockResolvedValue({}),
      // The OpenAI spend guard counts today's fallback calls. Without
      // this the guard fails closed and the fallback never fires.
      count: vi.fn().mockResolvedValue(0),
    },
  },
}))

const original = globalThis.fetch

function mockFetchSequence(responses: Array<{ status: number; body: unknown }>) {
  let i = 0
  return vi.fn(async (_url: string, _init: RequestInit) => {
    const r = responses[Math.min(i++, responses.length - 1)]
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      text: async () => (typeof r.body === 'string' ? r.body : JSON.stringify(r.body)),
      json: async () => r.body,
    } as unknown as Response
  })
}

const MODEL_GONE = {
  error: { message: 'The model `x` does not exist or you do not have access to it.', code: 'model_not_found' },
}
const OK_BODY = { choices: [{ message: { content: 'a real reply' } }], model: 'fallback-model' }

beforeEach(() => {
  vi.resetModules()
  process.env.GROQ_API_KEY = 'test-key'
  process.env.GROQ_MODEL = 'primary-model'
  process.env.GROQ_FALLBACK_MODEL = 'fallback-model'
})

afterEach(() => {
  globalThis.fetch = original
  delete process.env.GROQ_MODEL
  delete process.env.GROQ_FALLBACK_MODEL
})

describe('createChatCompletion', () => {
  it('falls back to another model when the primary has been retired', async () => {
    const fetchMock = mockFetchSequence([
      { status: 404, body: MODEL_GONE },
      { status: 200, body: OK_BODY },
    ])
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const { createChatCompletion } = await import('@/lib/groq')
    const res = await createChatCompletion({ messages: [{ role: 'user', content: 'hi' }] })

    expect(res.choices[0].message.content).toBe('a real reply')
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const secondBody = JSON.parse(String(fetchMock.mock.calls[1][1].body))
    expect(secondBody.model).toBe('fallback-model')
  })

  it('still fails fast on a genuinely permanent error like bad auth', async () => {
    const fetchMock = mockFetchSequence([{ status: 401, body: { error: { message: 'Invalid API Key' } } }])
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const { createChatCompletion } = await import('@/lib/groq')
    await expect(
      createChatCompletion({ messages: [{ role: 'user', content: 'hi' }] })
    ).rejects.toThrow(/401/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('ships defaults where the fallback differs from the primary', async () => {
    delete process.env.GROQ_MODEL
    delete process.env.GROQ_FALLBACK_MODEL
    const { GROQ_MODEL, GROQ_FALLBACK_MODEL } = await import('@/lib/groq')
    expect(GROQ_MODEL).not.toBe(GROQ_FALLBACK_MODEL)
  })
})

describe('model ladder', () => {
  it('keeps walking past a model this account cannot reach', async () => {
    // The live outage: a valid key getting 404 "does not exist or you do
    // not have access to it" on the first TWO models. A pair gave up; a
    // ladder finds whatever the account can actually reach.
    process.env.GROQ_MODELS = 'gone-a,gone-b,alive-c'
    const fetchMock = mockFetchSequence([
      { status: 404, body: MODEL_GONE },
      { status: 404, body: MODEL_GONE },
      { status: 200, body: OK_BODY },
    ])
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const { createChatCompletion } = await import('@/lib/groq')
    const res = await createChatCompletion({ messages: [{ role: 'user', content: 'hi' }] })

    expect(res.choices[0].message.content).toBe('a real reply')
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(JSON.parse(String(fetchMock.mock.calls[2][1].body)).model).toBe('alive-c')
    delete process.env.GROQ_MODELS
  })

  it('does not hammer every rung with a request that is doomed anyway', async () => {
    // Bad auth fails identically on all of them — one attempt is enough.
    process.env.GROQ_MODELS = 'a,b,c,d'
    const fetchMock = mockFetchSequence([{ status: 401, body: { error: { message: 'Invalid API Key' } } }])
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const { createChatCompletion } = await import('@/lib/groq')
    await expect(createChatCompletion({ messages: [{ role: 'user', content: 'hi' }] })).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    delete process.env.GROQ_MODELS
  })

  it('ships a ladder with more than one family on it', async () => {
    delete process.env.GROQ_MODELS
    delete process.env.GROQ_MODEL
    delete process.env.GROQ_FALLBACK_MODEL
    const { GROQ_MODELS } = await import('@/lib/groq')
    expect(GROQ_MODELS.length).toBeGreaterThan(2)
    // Not all llama — the whole point is that one family being unreachable
    // should not take the app down.
    expect(GROQ_MODELS.some(m => !m.includes('llama'))).toBe(true)
  })
})

describe('cross-provider fallback', () => {
  it('reaches OpenAI when every Groq model is unreachable', async () => {
    process.env.GROQ_MODELS = 'gone-a,gone-b'
    process.env.OPENAI_API_KEY = 'sk-test'

    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('api.groq.com')) {
        return { ok: false, status: 404, text: async () => JSON.stringify(MODEL_GONE), json: async () => MODEL_GONE } as unknown as Response
      }
      const body = { choices: [{ message: { content: 'from openai' } }], usage: {} }
      return { ok: true, status: 200, text: async () => JSON.stringify(body), json: async () => body } as unknown as Response
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const { createChatCompletion } = await import('@/lib/groq')
    const res = await createChatCompletion({ messages: [{ role: 'user', content: 'hi' }] })

    expect(res.choices[0].message.content).toBe('from openai')
    expect(fetchMock.mock.calls.some(c => String(c[0]).includes('api.openai.com'))).toBe(true)

    delete process.env.GROQ_MODELS
    delete process.env.OPENAI_API_KEY
  })

  it('stays dormant when no OpenAI key is configured', async () => {
    process.env.GROQ_MODELS = 'gone-a'
    delete process.env.OPENAI_API_KEY

    const fetchMock = mockFetchSequence([{ status: 404, body: MODEL_GONE }])
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const { createChatCompletion } = await import('@/lib/groq')
    await expect(createChatCompletion({ messages: [{ role: 'user', content: 'hi' }] })).rejects.toThrow()
    expect(fetchMock.mock.calls.every(c => !String(c[0]).includes('openai.com'))).toBe(true)

    delete process.env.GROQ_MODELS
  })
})
