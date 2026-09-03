import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// The outage this guards against: Groq retired llama-3.1-8b-instant, every
// call 404'd for seventeen days, and the "resilient" wrapper never tried
// anything else — a 404 was classed permanent, and the fallback model was
// the same dead model. Both halves are asserted here.

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
