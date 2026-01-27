import Groq from 'groq-sdk'

let groq: Groq | null = null

export function getGroq(): Groq {
  if (!groq) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return groq
}

export const GROQ_MODEL = 'llama-3.1-8b-instant'

export const GROQ_DEFAULTS = {
  temperature: 0.7,
  max_tokens: 300,
} as const
