export const GROQ_MODEL = 'llama-3.1-8b-instant'

export const GROQ_DEFAULTS = {
  temperature: 0.7,
  max_tokens: 300,
} as const

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatCompletionOptions {
  model?: string
  messages: ChatMessage[]
  max_tokens?: number
  temperature?: number
}

interface ChatCompletionResponse {
  choices: { message: { content: string | null } }[]
}

// Direct fetch wrapper for Groq API — avoids SDK connection issues in serverless
async function groqChatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set')
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model || GROQ_MODEL,
      messages: options.messages,
      max_tokens: options.max_tokens ?? GROQ_DEFAULTS.max_tokens,
      temperature: options.temperature ?? GROQ_DEFAULTS.temperature,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown')
    throw new Error(`Groq API error ${response.status}: ${errorBody}`)
  }

  return response.json()
}

// Drop-in replacement: returns an object with the same .chat.completions.create() interface
export function getGroq() {
  return {
    chat: {
      completions: {
        create: groqChatCompletion,
      },
    },
  }
}
