/**
 * The download page's Guided Audio step lets visitors hear Voxu Voice answer
 * a journal entry, the way the coach replies to what you write in the app
 * (the journal conversation). The entry is shown on the page; the reply is
 * voiced once in Voxu Voice (app/api/voice/voxu-preview), then served from the
 * cache to everyone. Changing a line? Bump VOXU_PREVIEW_VERSION so it's voiced again.
 */
export const VOXU_PREVIEW_ENTRY = 'I keep starting things and not finishing them. I don’t know why I’m like this.'
export const VOXU_PREVIEW_LINES = [
  'You wrote that you keep starting things and not finishing them. That’s honest, and honesty is where this starts. You’re not broken. You’ve been carrying too many beginnings at once. So this week, finish one small thing. Just one. Tell me tonight how it went.',
] as const
export const VOXU_PREVIEW_VERSION = 2
