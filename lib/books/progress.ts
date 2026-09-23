/**
 * Where you are in a book, and when you'd finish at the pace you're going.
 *
 * Everything here returns null rather than a number it had to invent. That
 * is not fussiness — a progress bar is read as fact. "62%" built on a guessed
 * page count is the app lying in a place nobody would think to check, and
 * half of Open Library's results have no page count at all, so the unknown
 * case is the COMMON one, not the edge.
 *
 * The pace is the other place this could go wrong. Practice.plan holds a
 * typed "20 pages", and that string is never parsed — see the comment on the
 * model; the moment Voxu reads it as data it has an opinion about somebody's
 * reading. So the pace here comes only from two real readings the person
 * entered themselves, and is described as what it is.
 *
 * Pure.
 */

export interface BookState {
  pages: number | null
  currentPage: number | null
  currentPageAt: Date | null
  prevPage: number | null
  prevPageAt: Date | null
}

/** 0–100, or null when either end of the fraction is unknown. */
export function percentRead(state: Pick<BookState, 'pages' | 'currentPage'>): number | null {
  const { pages, currentPage } = state
  if (!pages || pages <= 0) return null
  if (currentPage == null || currentPage < 0) return null
  // Past the end happens: a reader counts the index, or the edition differs
  // from the catalogue's. Cap rather than show 104%.
  return Math.min(100, Math.round((currentPage / pages) * 100))
}

/** Pages remaining, or null. Never negative. */
export function pagesLeft(state: Pick<BookState, 'pages' | 'currentPage'>): number | null {
  const { pages, currentPage } = state
  if (!pages || pages <= 0) return null
  if (currentPage == null || currentPage < 0) return null
  return Math.max(0, pages - currentPage)
}

/** Whole days between two instants, floored. */
function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000)
}

/**
 * Pages a day, from the last two readings they entered.
 *
 * Requires real movement over real time: two readings, at least a day apart,
 * with the page having gone up. Anything else is null — two readings on the
 * same afternoon say nothing about a daily pace, and a page that went
 * backwards means they restarted or mistyped, which is not a negative pace.
 *
 * Two points is a rough number. The UI says "recent pace" for that reason
 * rather than dressing it up as an average.
 */
export function pacePerDay(state: BookState): number | null {
  const { currentPage, currentPageAt, prevPage, prevPageAt } = state
  if (currentPage == null || prevPage == null) return null
  if (!currentPageAt || !prevPageAt) return null

  const days = daysBetween(prevPageAt, currentPageAt)
  if (days < 1) return null

  const read = currentPage - prevPage
  if (read <= 0) return null

  const pace = read / days
  // Under half a page a day rounds to zero and would produce a finish date
  // decades out; it is honest to just not claim one.
  if (pace < 0.5) return null
  return Math.round(pace * 10) / 10
}

export interface Finish {
  /** Days from the last reading. */
  days: number
  /** The date, for formatting by the caller. */
  date: Date
  /** Pages a day it assumes — shown, so the estimate can be argued with. */
  pace: number
}

/**
 * When they'd finish, at the pace they've actually been reading.
 *
 * Null unless the total, the current page and a real pace are all known.
 * Anchored to the last reading rather than today: if they last read a
 * fortnight ago, the honest answer is what that pace implied, not a date
 * pushed forward by the time they have not been reading.
 */
export function finishEstimate(state: BookState): Finish | null {
  const left = pagesLeft(state)
  const pace = pacePerDay(state)
  if (left == null || pace == null) return null
  if (left === 0) return null

  const days = Math.ceil(left / pace)
  // Beyond a year the number stops being useful and starts being a comment
  // on the reader, which is not this app's job.
  if (days > 365) return null

  const from = state.currentPageAt ?? new Date()
  return { days, date: new Date(from.getTime() + days * 86_400_000), pace }
}

export interface PageSample {
  currentPage: number
  currentPageAt: Date
  prevPage: number | null
  prevPageAt: Date | null
}

/**
 * What to store when somebody says what page they're on.
 *
 * The current reading becomes the previous one — EXCEPT when it was taken
 * on the same local day. Without that exception, correcting a typo
 * ("140... no, 148") would overwrite the real earlier sample with one from
 * ten seconds ago, and the pace would be computed from a ten-second window
 * and thrown away as unusable. So a same-day change is treated as an edit of
 * today's reading, not a new one.
 */
export function nextPageSample(
  existing: Pick<BookState, 'currentPage' | 'currentPageAt' | 'prevPage' | 'prevPageAt'>,
  page: number,
  at = new Date(),
): PageSample {
  const sameDay =
    existing.currentPageAt != null &&
    existing.currentPageAt.getFullYear() === at.getFullYear() &&
    existing.currentPageAt.getMonth() === at.getMonth() &&
    existing.currentPageAt.getDate() === at.getDate()

  if (sameDay) {
    return {
      currentPage: page,
      currentPageAt: at,
      prevPage: existing.prevPage ?? null,
      prevPageAt: existing.prevPageAt ?? null,
    }
  }

  return {
    currentPage: page,
    currentPageAt: at,
    prevPage: existing.currentPage ?? null,
    prevPageAt: existing.currentPageAt ?? null,
  }
}

/**
 * The one line under the title.
 *
 * Built by cases rather than one template with holes, because each missing
 * piece changes what there is to say — and saying less is always available.
 */
export function progressLine(state: BookState): string | null {
  const { pages, currentPage } = state

  if (currentPage == null) {
    return pages ? `${pages} pages` : null
  }

  if (!pages) {
    // No total, so no percentage and no estimate. Their page is still worth
    // showing back: it is the thing they told us.
    return `Page ${currentPage}`
  }

  const left = pagesLeft(state)
  if (left === 0) return `Page ${currentPage} of ${pages} — that's the lot`

  const percent = percentRead(state)
  return `Page ${currentPage} of ${pages} · ${percent}%`
}
