'use client'

/**
 * The books you finished.
 *
 * Nothing appears until there is a book, and nothing appears at all for
 * somebody who never resolves one — the reading discipline works perfectly
 * well as a typed title, and a permanently empty "Shelf" heading would be the
 * app advertising a feature back at the person who did not want it.
 *
 * Counts only what happened: books they marked finished. No target, no
 * "2 behind last month", no books-per-year pace. A number on this screen is
 * a record, not a verdict.
 */

import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { BookSheet } from './BookSheet'

interface ShelfBook {
  id: string
  title: string
  author: string | null
  cover_url: string | null
  finished_at: string | null
}

export function Shelf() {
  const [books, setBooks] = useState<ShelfBook[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  const load = () => {
    fetch('/api/books')
      .then(res => (res.ok ? res.json() : null))
      .then(data => setBooks(data ? (data.finished ?? []) : []))
      .catch(() => setBooks([]))
  }

  useEffect(load, [])

  // null = still loading, [] = nothing to show. Both render nothing: a
  // skeleton for a section that is usually absent is worse than the wait.
  if (!books?.length) return null

  const thisYear = books.filter(
    b => b.finished_at && new Date(b.finished_at).getFullYear() === new Date().getFullYear(),
  ).length

  return (
    <div className="mt-7 space-y-3">
      <div>
        <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">Finished</p>
        <p className="text-[12px] text-white/45 mt-0.5">
          {thisYear > 0
            ? `${thisYear} ${thisYear === 1 ? 'book' : 'books'} this year.`
            : 'Books you got to the end of.'}
        </p>
      </div>

      {/* A row of covers, scrolling sideways — it is a shelf, and a shelf is
          the one thing on this page that should look like its subject. Its
          own overflow container, so the page body never scrolls sideways. */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-5 px-5">
        {books.map(book => (
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
