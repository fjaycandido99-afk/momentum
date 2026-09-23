import { describe, it, expect } from 'vitest'
import {
  believablePages,
  bookKey,
  isGrounded,
  mergeMatches,
  normalizeGoogle,
  normalizeOpenLibrary,
  bookForTitles,
  type BookMatch,
} from '@/lib/books/lookup'

describe('page counts we are willing to believe', () => {
  it('takes a real one', () => {
    expect(believablePages(336)).toBe(336)
  })

  it('refuses the values providers use for "unknown"', () => {
    // 0 and 1 are metadata stubs, not books. "Page 40 of 1" is worse than
    // showing no total at all.
    expect(believablePages(0)).toBeNull()
    expect(believablePages(1)).toBeNull()
    expect(believablePages(undefined)).toBeNull()
    expect(believablePages(null)).toBeNull()
    expect(believablePages('not a number')).toBeNull()
  })

  it('refuses collected-works nonsense', () => {
    expect(believablePages(48000)).toBeNull()
  })

  it('never invents one', () => {
    // The whole point: absent stays absent. No default, no estimate.
    expect(believablePages({})).toBeNull()
    expect(believablePages([])).toBeNull()
  })
})

describe('deciding two results are the same book', () => {
  it('ignores punctuation, case and spacing', () => {
    expect(bookKey('Rich Dad Poor Dad', 'Robert Kiyosaki')).toBe(
      bookKey('rich dad, poor dad', 'robert  kiyosaki'),
    )
  })

  it('survives a leading article moving around', () => {
    expect(bookKey('The Hobbit', 'Tolkien')).toBe(bookKey('Hobbit', 'Tolkien'))
  })

  it('keeps different books apart', () => {
    expect(bookKey('Atomic Habits', 'James Clear')).not.toBe(
      bookKey('Atomic Habits', 'Someone Else'),
    )
  })
})

describe('reading Google Books', () => {
  const json = {
    items: [
      {
        id: 'abc123',
        volumeInfo: {
          title: 'Atomic Habits',
          authors: ['James Clear'],
          pageCount: 320,
          publishedDate: '2018-10-16',
          imageLinks: { thumbnail: 'http://books.google.com/cover.jpg' },
        },
      },
    ],
  }

  it('pulls out what it needs', () => {
    const [book] = normalizeGoogle(json)
    expect(book).toMatchObject({
      id: 'google:abc123',
      title: 'Atomic Habits',
      author: 'James Clear',
      pages: 320,
      year: 2018,
      source: 'google',
    })
  })

  it('upgrades the cover to https', () => {
    // An http image on an https page is blocked, so the cover would just
    // silently not appear.
    expect(normalizeGoogle(json)[0].coverUrl).toBe('https://books.google.com/cover.jpg')
  })

  it('survives every field being missing', () => {
    expect(normalizeGoogle({ items: [{ volumeInfo: { title: 'Untitled Thing' } }] })[0]).toMatchObject({
      title: 'Untitled Thing',
      author: null,
      pages: null,
      coverUrl: null,
      year: null,
    })
  })

  it('drops a result with no title, and survives junk', () => {
    expect(normalizeGoogle({ items: [{ volumeInfo: {} }] })).toHaveLength(0)
    expect(normalizeGoogle({})).toEqual([])
    expect(normalizeGoogle(null)).toEqual([])
    expect(normalizeGoogle({ items: 'nope' })).toEqual([])
  })
})

describe('reading Open Library', () => {
  const json = {
    docs: [
      {
        key: '/works/OL123W',
        title: 'Meditations',
        author_name: ['Marcus Aurelius'],
        number_of_pages_median: 254,
        cover_i: 8765,
        first_publish_year: 180,
      },
    ],
  }

  it('pulls out what it needs, and builds the cover URL', () => {
    const [book] = normalizeOpenLibrary(json)
    expect(book).toMatchObject({
      id: 'openlibrary:/works/OL123W',
      title: 'Meditations',
      author: 'Marcus Aurelius',
      pages: 254,
      coverUrl: 'https://covers.openlibrary.org/b/id/8765-M.jpg',
      source: 'openlibrary',
    })
  })

  it('survives junk', () => {
    expect(normalizeOpenLibrary({ docs: [{}] })).toHaveLength(0)
    expect(normalizeOpenLibrary(null)).toEqual([])
  })

  it('handles a real response, captured from the live API', () => {
    // Verbatim from
    //   openlibrary.org/search.json?q=atomic+habits&limit=2&fields=...
    // on 2026-09-23. The normalizers were written against the documented
    // shape; this is the shape that actually came back. Note the second
    // doc has NO number_of_pages_median — which is the common case, and
    // why the page count must be allowed to stay null.
    const live = {
      numFound: 212,
      docs: [
        {
          author_name: ['James Clear'],
          cover_i: 12539702,
          first_publish_year: 2016,
          key: '/works/OL17930368W',
          number_of_pages_median: 323,
          title: 'Atomic Habits',
        },
        {
          author_name: ['Julie Ann Price'],
          cover_i: 15095106,
          first_publish_year: 2019,
          key: '/works/OL30048054W',
          title: 'Companion Workbook : Atomic Habits',
        },
      ],
    }
    const books = normalizeOpenLibrary(live)
    expect(books).toHaveLength(2)
    expect(books[0]).toEqual({
      id: 'openlibrary:/works/OL17930368W',
      title: 'Atomic Habits',
      author: 'James Clear',
      pages: 323,
      coverUrl: 'https://covers.openlibrary.org/b/id/12539702-M.jpg',
      year: 2016,
      source: 'openlibrary',
    })
    expect(books[1].pages).toBeNull()
    expect(books[1].coverUrl).toContain('15095106')
  })

  it('keeps the workbook and the book apart', () => {
    // "Companion Workbook : Atomic Habits" must not merge into "Atomic
    // Habits" — same words, different book, and a summary of one is wrong
    // about the other.
    const books = normalizeOpenLibrary({
      docs: [
        { key: '/works/A', title: 'Atomic Habits', author_name: ['James Clear'] },
        { key: '/works/B', title: 'Companion Workbook : Atomic Habits', author_name: ['Julie Ann Price'] },
      ],
    })
    expect(mergeMatches(books)).toHaveLength(2)
  })
})

describe('merging the two providers', () => {
  const google: BookMatch[] = [
    { id: 'g1', title: 'Atomic Habits', author: 'James Clear', pages: 320, coverUrl: null, year: 2018, source: 'google' },
  ]
  const openLibrary: BookMatch[] = [
    { id: 'o1', title: 'Atomic habits', author: 'James Clear', pages: null, coverUrl: 'https://covers/1-M.jpg', year: null, source: 'openlibrary' },
  ]

  it('keeps the page count from one and the cover from the other', () => {
    // The actual reason there are two providers: Google knows the page
    // count, Open Library has the cover. Picking a winner loses half.
    const merged = mergeMatches(google, openLibrary)
    expect(merged).toHaveLength(1)
    expect(merged[0].pages).toBe(320)
    expect(merged[0].coverUrl).toBe('https://covers/1-M.jpg')
  })

  it('does not overwrite a value it already has', () => {
    const second: BookMatch[] = [{ ...openLibrary[0], pages: 999 }]
    expect(mergeMatches(google, second)[0].pages).toBe(320)
  })

  it('keeps genuinely different books', () => {
    const other: BookMatch[] = [{ ...google[0], id: 'g2', title: 'Deep Work', author: 'Cal Newport' }]
    expect(mergeMatches(google, other)).toHaveLength(2)
  })

  it('puts books with a known author first', () => {
    const stub: BookMatch[] = [{ ...google[0], id: 'g3', title: 'Mystery Book', author: null }]
    const merged = mergeMatches(stub, google)
    expect(merged[0].author).toBe('James Clear')
  })

  it('handles being given nothing', () => {
    expect(mergeMatches([], [])).toEqual([])
    expect(mergeMatches()).toEqual([])
  })
})

describe('finding the book behind a typed line', () => {
  const shelf = [
    { id: '1', title: 'Rich Dad, Poor Dad' },
    { id: '2', title: 'The Hobbit' },
  ]

  it('matches however the plan row was typed', () => {
    expect(bookForTitles(['rich dad poor dad'], shelf)?.id).toBe('1')
    expect(bookForTitles(['RICH DAD   POOR DAD'], shelf)?.id).toBe('1')
  })

  it('survives a leading article on either side', () => {
    expect(bookForTitles(['Hobbit'], shelf)?.id).toBe('2')
  })

  it('takes the first line that matches, and ignores the rest', () => {
    expect(bookForTitles(['20 minutes of something', 'The Hobbit'], shelf)?.id).toBe('2')
  })

  it('returns nothing when no line matches — the normal case', () => {
    // Somebody who never resolved a book must never be prompted about one.
    expect(bookForTitles(['Some book I typed'], shelf)).toBeNull()
    expect(bookForTitles([], shelf)).toBeNull()
    expect(bookForTitles(['  '], shelf)).toBeNull()
    expect(bookForTitles(['The Hobbit'], [])).toBeNull()
  })

  it('does not match on a shared word', () => {
    // Not fuzzy on purpose: the cost of a wrong match is a summary about
    // the wrong book.
    expect(bookForTitles(['Dad'], shelf)).toBeNull()
    expect(bookForTitles(['Rich'], shelf)).toBeNull()
  })
})

describe('what is safe to summarise', () => {
  it('needs a title and an author', () => {
    // Hand a model a bare title and it will describe the wrong book by that
    // name, or one that does not exist. An author is the grounding.
    expect(isGrounded({ title: 'Atomic Habits', author: 'James Clear' })).toBe(true)
    expect(isGrounded({ title: 'Atomic Habits', author: null })).toBe(false)
    expect(isGrounded({ title: '', author: 'James Clear' })).toBe(false)
    expect(isGrounded({ title: '   ', author: '  ' })).toBe(false)
    expect(isGrounded(null)).toBe(false)
    expect(isGrounded(undefined)).toBe(false)
  })
})
