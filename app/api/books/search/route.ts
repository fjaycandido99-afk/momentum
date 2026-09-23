/**
 * GET /api/books/search?q=atomic+habits — resolve a typed title to real books.
 *
 * Server-side rather than from the browser for three reasons: neither
 * provider promises CORS to us, the results are worth caching across users
 * (everyone reads the same fifty books), and a keyless Google Books query is
 * rate-limited per IP — which is one IP if it comes from our server and
 * thousands if it comes from phones.
 *
 * No AI here, so no AI quota. It is metered only by the per-minute limiter:
 * this is a typeahead, and a typeahead that costs a paid allowance per
 * keystroke would be a trap.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { mergeMatches, normalizeGoogle, normalizeOpenLibrary } from '@/lib/books/lookup'

export const dynamic = 'force-dynamic'

const TIMEOUT_MS = 4000
const MAX_RESULTS = 6

/**
 * Both providers, in parallel, and a failure of either is not a failure.
 *
 * Open Library is the one carrying this. Measured 2026-09-23: keyless
 * Google Books returned 429 on every attempt from a normal IP, while Open
 * Library answered 200 with title, author, cover and a page count. So
 * Google is treated as an optional enhancement — it has better page-count
 * coverage when it answers — and the feature is built to work without it.
 * If page counts turn out to matter, the fix is a Google Books API key
 * (free), not more retries.
 *
 * A rejected or rate-limited fetch becomes an empty list, and `degraded` is
 * only true when BOTH fail — because one provider answering is a usable
 * result, and "no such book" and "we couldn't reach the catalogue" are
 * different things to tell a person.
 */
async function ask(url: string): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Open Library asks for a contactable agent, and being a good
        // citizen of a free API is how it stays free.
        'User-Agent': 'Voxu/1.0 (+https://voxu.app; support@voxu.app)',
      },
      // Everyone searches the same titles; a day is fine for book metadata.
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { allowed } = rateLimit(`books-search:${user.id}`, { limit: 30, windowSeconds: 60 })
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const q = (request.nextUrl.searchParams.get('q') ?? '').trim()
    // Two characters matches half the catalogue; the answer would be noise.
    if (q.length < 3) return NextResponse.json({ books: [] })
    if (q.length > 120) return NextResponse.json({ error: 'Query too long' }, { status: 413 })

    const encoded = encodeURIComponent(q)
    const [google, openLibrary] = await Promise.all([
      ask(`https://www.googleapis.com/books/v1/volumes?q=${encoded}&maxResults=${MAX_RESULTS}&printType=books`),
      ask(
        `https://openlibrary.org/search.json?q=${encoded}&limit=${MAX_RESULTS}` +
          '&fields=key,title,author_name,number_of_pages_median,cover_i,first_publish_year',
      ),
    ])

    const books = mergeMatches(normalizeGoogle(google), normalizeOpenLibrary(openLibrary)).slice(0, MAX_RESULTS)

    // An empty list is a real answer — a typo, or a book neither provider
    // has. The UI keeps the typed title either way; resolving is an upgrade
    // to what they wrote, never a gate on saving it.
    return NextResponse.json({
      books,
      // So the UI can say "we couldn't reach the catalogue" rather than
      // "no such book", which are different things to a person.
      degraded: google === null && openLibrary === null,
    })
  } catch (error) {
    console.error('Book search error:', error)
    return NextResponse.json({ books: [], degraded: true })
  }
}
