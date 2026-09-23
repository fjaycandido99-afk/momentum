/**
 * /api/books — the shelf.
 *
 * GET    what they're reading and what they've finished
 * POST   add a book (resolved from the catalogue, or just a title)
 * PATCH  the page they're on, finishing it, or caching a summary
 * DELETE remove one
 *
 * A book can be added with nothing but a title. Resolving it against a
 * catalogue is an upgrade — it buys a cover, a page count and the summary —
 * but the app must never refuse to record that somebody is reading something
 * because a metadata provider had not heard of it.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { nextPageSample } from '@/lib/books/progress'
import { validateSummary, type SummaryDraft } from '@/lib/books/summary'

export const dynamic = 'force-dynamic'

const MAX_BOOKS = 300
/** A page number nobody has. Guards a fat-fingered paste, not the reader. */
const MAX_PAGE = 20000

const SELECT = {
  id: true,
  title: true,
  author: true,
  pages: true,
  cover_url: true,
  source_id: true,
  current_page: true,
  current_page_at: true,
  prev_page: true,
  prev_page_at: true,
  summary: true,
  summary_day: true,
  started_at: true,
  finished_at: true,
} as const

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  try {
    const user = await requireUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const books = await prisma.book.findMany({
      where: { user_id: user.id },
      select: SELECT,
      // Unfinished first — that is the one they are on — then most recent.
      orderBy: [{ finished_at: 'asc' }, { updated_at: 'desc' }],
      take: MAX_BOOKS,
    })

    return NextResponse.json({
      reading: books.filter(b => !b.finished_at),
      finished: books.filter(b => b.finished_at),
    })
  } catch (error) {
    console.error('Books GET error:', error)
    return NextResponse.json({ error: 'Could not load your books' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(`books-write:${user.id}`, { limit: 30, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await request.json().catch(() => ({}))
    const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 300) : ''
    if (!title) return NextResponse.json({ error: 'A title is required' }, { status: 400 })

    const count = await prisma.book.count({ where: { user_id: user.id } })
    if (count >= MAX_BOOKS) {
      return NextResponse.json({ error: 'That is a lot of books' }, { status: 409 })
    }

    const pages = Number.isInteger(body?.pages) && body.pages > 0 && body.pages <= MAX_PAGE ? body.pages : null

    const book = await prisma.book.create({
      data: {
        user_id: user.id,
        title,
        author: typeof body?.author === 'string' ? body.author.trim().slice(0, 200) || null : null,
        pages,
        // Only the two hosts we build these from, so a stored record can
        // never point the app's own <img> at somewhere arbitrary.
        cover_url:
          typeof body?.coverUrl === 'string' &&
          /^https:\/\/(covers\.openlibrary\.org|books\.google\.com)\//.test(body.coverUrl)
            ? body.coverUrl
            : null,
        source_id: typeof body?.sourceId === 'string' ? body.sourceId.slice(0, 200) : null,
      },
      select: SELECT,
    })

    return NextResponse.json({ book })
  } catch (error) {
    console.error('Books POST error:', error)
    return NextResponse.json({ error: 'Could not add that book' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed } = rateLimit(`books-write:${user.id}`, { limit: 30, windowSeconds: 60 })
    if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await request.json().catch(() => ({}))
    const id = typeof body?.id === 'string' ? body.id : ''
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    // Scoped by user_id as well as id — an id alone would let anybody patch
    // anybody's shelf.
    const existing = await prisma.book.findFirst({
      where: { id, user_id: user.id },
      select: SELECT,
    })
    if (!existing) return NextResponse.json({ error: 'No such book' }, { status: 404 })

    const data: Record<string, unknown> = {}

    if (body.page !== undefined) {
      const page = Number(body.page)
      if (!Number.isFinite(page) || page < 0 || page > MAX_PAGE) {
        return NextResponse.json({ error: 'That page number is not one' }, { status: 400 })
      }
      const sample = nextPageSample(
        {
          currentPage: existing.current_page,
          currentPageAt: existing.current_page_at,
          prevPage: existing.prev_page,
          prevPageAt: existing.prev_page_at,
        },
        Math.round(page),
      )
      data.current_page = sample.currentPage
      data.current_page_at = sample.currentPageAt
      data.prev_page = sample.prevPage
      data.prev_page_at = sample.prevPageAt
    }

    if (body.finished !== undefined) {
      // Unfinishing is allowed: people mark the wrong book, and a shelf you
      // cannot correct is a shelf people stop trusting.
      data.finished_at = body.finished ? new Date() : null
    }

    if (body.summary !== undefined) {
      if (body.summary === null) {
        data.summary = null
        data.summary_day = null
      } else {
        // Re-validated on the way in. The summary route already checks, but
        // this accepts JSON from a client, and "the other endpoint checked
        // it" is how unchecked data gets stored.
        const problem = validateSummary(body.summary as SummaryDraft)
        if (problem) return NextResponse.json({ error: 'That summary is not storable', problem }, { status: 422 })
        data.summary = body.summary
        data.summary_day = Number.isInteger(body?.summaryDay) ? body.summaryDay : null
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to change' }, { status: 400 })
    }

    const book = await prisma.book.update({ where: { id }, data, select: SELECT })
    return NextResponse.json({ book })
  } catch (error) {
    console.error('Books PATCH error:', error)
    return NextResponse.json({ error: 'Could not save that' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    // deleteMany, not delete: scoped by user_id, and a miss is 0 rows
    // rather than a throw.
    const { count } = await prisma.book.deleteMany({ where: { id, user_id: user.id } })
    if (count === 0) return NextResponse.json({ error: 'No such book' }, { status: 404 })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Books DELETE error:', error)
    return NextResponse.json({ error: 'Could not remove that' }, { status: 500 })
  }
}
