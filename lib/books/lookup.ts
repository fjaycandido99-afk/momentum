/**
 * Turning "rich dad poor dad" into a book the app actually knows.
 *
 * This exists to GROUND everything else. The reading practice takes a free
 * text title, which is fine for a note to yourself — but the moment Voxu
 * offers a summary of that book, free text is a liability: hand a model the
 * string "Atomik Habbits" and it will write you a confident summary of
 * something. Resolve the title to a real book first, with a real author, and
 * the summary has something to be about.
 *
 * Two providers because they fail differently: Google Books usually has a
 * page count and often no cover for older editions; Open Library almost
 * always has a cover and frequently no page count. Neither is asked to
 * guess — a missing page count stays null, because "about 300 pages" in a
 * progress bar is a number the app made up.
 *
 * Pure. The fetching lives in app/api/books/search.
 */

export type BookSource = 'google' | 'openlibrary'

export interface BookMatch {
  /** Provider id, so a pick can be stored and re-fetched. */
  id: string
  title: string
  author: string | null
  /** Total pages, or null. NEVER estimated. */
  pages: number | null
  coverUrl: string | null
  year: number | null
  source: BookSource
}

/**
 * A page count we are willing to believe.
 *
 * Providers return 0 for "unknown", 1 for some metadata stubs, and
 * occasionally five-figure nonsense for collected works records. Any of those
 * shown as "page 40 of 1" is worse than showing nothing, so they become null.
 */
export function believablePages(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return null
  const pages = Math.round(n)
  if (pages < 10 || pages > 5000) return null
  return pages
}

/**
 * A title flattened for matching.
 *
 * The one place this is decided. A plan row says "rich dad poor dad", the
 * catalogue says "Rich Dad, Poor Dad", and the shelf has to recognise them as
 * the same book — so case, punctuation and spacing all go. A leading article
 * goes too, because the same book arrives titled two ways ("Hobbit, The").
 *
 * Deliberately not fuzzy. Anything cleverer starts matching books that are
 * not the same book, and the cost of a wrong match here is a summary about
 * the wrong book.
 */
export function titleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .replace(/^(the|a|an)/, '')
}

/** Flattened title+author, for deciding two results are the same book. */
export function bookKey(title: string, author: string | null): string {
  return titleKey(title) + '|' + (author ? titleKey(author) : '')
}

/**
 * The resolved book behind a set of typed lines, if there is one.
 *
 * A reading day's plan is free text and may hold more than one line. This
 * finds the first line that matches a book already on the shelf, and returns
 * nothing when none do — which is the normal case for somebody who never
 * resolved one, and must stay silent rather than prompt about a book that
 * does not exist.
 */
export function bookForTitles<T extends { title: string }>(
  titles: readonly string[],
  books: readonly T[],
): T | null {
  for (const raw of titles) {
    const key = titleKey(raw.trim())
    if (!key) continue
    const hit = books.find(b => titleKey(b.title) === key)
    if (hit) return hit
  }
  return null
}

interface GoogleVolume {
  id?: unknown
  volumeInfo?: {
    title?: unknown
    subtitle?: unknown
    authors?: unknown
    pageCount?: unknown
    publishedDate?: unknown
    imageLinks?: { thumbnail?: unknown; smallThumbnail?: unknown }
  }
}

export function normalizeGoogle(json: unknown): BookMatch[] {
  const items = (json as { items?: unknown })?.items
  if (!Array.isArray(items)) return []
  const out: BookMatch[] = []
  for (const raw of items as GoogleVolume[]) {
    const info = raw?.volumeInfo
    const title = typeof info?.title === 'string' ? info.title.trim() : ''
    if (!title) continue
    const authors = Array.isArray(info?.authors) ? info!.authors : []
    const author = typeof authors[0] === 'string' ? (authors[0] as string).trim() : null
    const thumb = info?.imageLinks?.thumbnail ?? info?.imageLinks?.smallThumbnail
    const year = typeof info?.publishedDate === 'string' ? Number(info.publishedDate.slice(0, 4)) : NaN
    out.push({
      id: typeof raw.id === 'string' ? `google:${raw.id}` : `google:${bookKey(title, author)}`,
      title,
      author,
      pages: believablePages(info?.pageCount),
      // http from the API, and an http image on an https page is blocked.
      coverUrl: typeof thumb === 'string' ? thumb.replace(/^http:/, 'https:') : null,
      year: Number.isFinite(year) ? year : null,
      source: 'google',
    })
  }
  return out
}

interface OpenLibraryDoc {
  key?: unknown
  title?: unknown
  author_name?: unknown
  number_of_pages_median?: unknown
  cover_i?: unknown
  first_publish_year?: unknown
}

export function normalizeOpenLibrary(json: unknown): BookMatch[] {
  const docs = (json as { docs?: unknown })?.docs
  if (!Array.isArray(docs)) return []
  const out: BookMatch[] = []
  for (const doc of docs as OpenLibraryDoc[]) {
    const title = typeof doc?.title === 'string' ? doc.title.trim() : ''
    if (!title) continue
    const authors = Array.isArray(doc?.author_name) ? doc.author_name : []
    const author = typeof authors[0] === 'string' ? (authors[0] as string).trim() : null
    const coverId = typeof doc?.cover_i === 'number' ? doc.cover_i : null
    const year = typeof doc?.first_publish_year === 'number' ? doc.first_publish_year : null
    out.push({
      id: typeof doc.key === 'string' ? `openlibrary:${doc.key}` : `openlibrary:${bookKey(title, author)}`,
      title,
      author,
      pages: believablePages(doc?.number_of_pages_median),
      coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null,
      year,
      source: 'openlibrary',
    })
  }
  return out
}

/**
 * One list out of two, keeping the more complete version of each book.
 *
 * Merged per field rather than per result: the Google row usually knows the
 * page count and the Open Library row usually has the cover, and picking a
 * winner would throw away half of what we asked for.
 */
export function mergeMatches(...lists: BookMatch[][]): BookMatch[] {
  const byKey = new Map<string, BookMatch>()
  for (const list of lists) {
    for (const match of list) {
      const key = bookKey(match.title, match.author)
      const existing = byKey.get(key)
      if (!existing) {
        byKey.set(key, { ...match })
        continue
      }
      byKey.set(key, {
        ...existing,
        pages: existing.pages ?? match.pages,
        coverUrl: existing.coverUrl ?? match.coverUrl,
        year: existing.year ?? match.year,
        author: existing.author ?? match.author,
      })
    }
  }
  // A result with an author is a real book; one without is usually a
  // metadata stub. Otherwise keep provider order, which is relevance.
  return [...byKey.values()].sort((a, b) => Number(!!b.author) - Number(!!a.author))
}

/**
 * Is this specific enough to summarise?
 *
 * The summary is only offered for a book the app resolved, with an author.
 * A title alone is how you end up describing the wrong book by the same
 * name, or a book that does not exist.
 */
export function isGrounded(match: Pick<BookMatch, 'title' | 'author'> | null | undefined): boolean {
  return !!match?.title?.trim() && !!match?.author?.trim()
}
