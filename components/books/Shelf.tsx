'use client'

/**
 * Your books — the one you're on, and the ones you finished.
 *
 * It showed only finished books at first, which left the book somebody is
 * ACTUALLY reading with no screen anywhere: the coach could see it (it is in
 * the chat context) and the reader could not. To get back to it they had to
 * remember the exact title and go through the plan editor. The thing you are
 * doing now should be the easiest thing to find, not the hardest.
 *
 * Nothing appears until there is a book, and nothing appears at all for
 * somebody who never resolves one — the reading discipline works perfectly
 * well as a typed title, and a permanently empty heading would be the app
 * advertising a feature back at the person who did not want it.
 *
 * Counts only what happened. No target, no "2 behind last month", no
 * books-per-year pace. A number on this screen is a record, not a verdict.
 */

import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { progressLine } from '@/lib/books/progress'
import { BookSheet } from './BookSheet'

interface ShelfBook {
  id: string
  title: string
  author: string | null
  cover_url: string | null
  pages: number | null
  current_page: number | null
  finished_at: string | null
}

export function Shelf() {
  const [reading, setReading] = useState<ShelfBook[]>([])
  const [finished, setFinished] = useState<ShelfBook[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  const load = () => {
    fetch('/api/books')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        setReading(data?.reading ?? [])
        setFinished(data ? (data.finished ?? []) : [])
      })
      .catch(() => {
        setReading([])
        setFinished([])
      })
  }

  useEffect(load, [])

  // null = still loading, and nothing at all = nothing to show. Both render
  // nothing: a skeleton for a section that is usually absent is worse than
  // the wait.
  if (finished === null) return null
  if (!reading.length && !finished.length) return null

  const thisYear = finished.filter(
    b => b.finished_at && new Date(b.finished_at).getFullYear() === new Date().getFullYear(),
  ).length

  return (
    <div className="mt-7 space-y-3">
      <div>
        <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">Books</p>
        <p className="text-[12px] text-white/45 mt-0.5">
          {thisYear > 0
            ? `${thisYear} finished this year.`
            : reading.length
              ? 'What you’re on.'
              : 'Books you got to the end of.'}
        </p>
      </div>

      {/* The one being read, first and as a row rather than a cover: it is
          the only book with something to say today. */}
      {reading.map(book => {
        const line = progressLine({
          pages: book.pages,
          currentPage: book.current_page,
          currentPageAt: null,
          prevPage: null,
          prevPageAt: null,
        })
        return (
          <button
            key={book.id}
            onClick={() => setOpen(book.title)}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.12] text-left active:scale-[0.99]"
          >
            {book.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={book.cover_url} alt="" className="w-9 h-[52px] object-cover rounded shrink-0 bg-white/[0.06]" />
            ) : (
              <div className="w-9 h-[52px] rounded shrink-0 bg-white/[0.06] grid place-items-center">
                <BookOpen className="w-3.5 h-3.5 text-white/30" />
              </div>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] text-white truncate">{book.title}</span>
              <span className="block text-[12px] text-white/45 truncate">
                {line ?? book.author ?? 'Reading'}
              </span>
            </span>
          </button>
        )
      })}

      {/* A row of covers, scrolling sideways — it is a shelf, and a shelf is
          the one thing on this page that should look like its subject. Its
          own overflow container, so the page body never scrolls sideways. */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-5 px-5" hidden={!finished.length}>
        {finished.map(book => (
          <button
            key={book.id}
            onClick={() => setOpen(book.title)}
            aria-label={book.author ? `${book.title} by ${book.author}` : book.title}
            className="shrink-0 w-[68px] text-left active:scale-[0.97] transition-transform"
          >
            {book.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={book.cover_url}
                alt=""
                className="w-[68px] h-[102px] object-cover rounded-lg bg-white/[0.06]"
              />
            ) : (
              <div className="w-[68px] h-[102px] rounded-lg bg-white/[0.06] border border-white/[0.12] grid place-items-center px-1.5">
                <BookOpen className="w-4 h-4 text-white/25" />
              </div>
            )}
            <p className="text-[11px] text-white/60 mt-1.5 leading-tight line-clamp-2">{book.title}</p>
          </button>
        ))}
      </div>

      {open && <BookSheet title={open} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  )
}
