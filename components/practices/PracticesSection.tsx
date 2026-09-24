'use client'

import { useCallback, useEffect, useState } from 'react'
import { BookOpen, Check, ChevronDown, ChevronUp, Minus, Plus, Repeat2 } from 'lucide-react'
import { AddPracticeSheet } from './AddPracticeSheet'
import { PracticePlanSheet } from './PracticePlanSheet'
import { PracticeGuideSheet } from './PracticeGuideSheet'
import { dayName, daysLabel, minimumLine, type PracticesPayload, type PracticeWire } from '@/lib/practices/logic'
import { haptic } from '@/lib/haptics'
import { trackFeature } from '@/lib/analytics/track'
import { matchMovement } from '@/lib/movements/swap'
import type { Movement } from '@/lib/movements/library'
import { MovementSheet } from './MovementSheet'
import { PatternGlyph } from '@/components/movements/PatternGlyph'
import { BookSheet } from '@/components/books/BookSheet'
import { PagePrompt } from '@/components/books/PagePrompt'
import { bookForTitles } from '@/lib/books/lookup'
import { PRESETS_BY_KEY } from '@/lib/practices/presets'

/** What the section needs of a book. */
interface BookLite {
  id: string
  title: string
  pages: number | null
  current_page: number | null
}

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * Practices: the disciplines someone already keeps, and whether they kept
 * them today.
 *
 * Three answers per practice, and the middle one is the reason this exists:
 * Done, Just the minimum, and Not today. "Just the minimum" is a KEPT day —
 * doing the floor when you didn't want to is the behaviour the whole feature
 * is trying to produce, so it is never drawn as a half-failure.
 *
 * `canAdd` is false on home: nothing on the home screen should be a form.
 * Adding happens on /era, where someone has gone looking.
 */
export function PracticesSection({ canAdd = false }: { canAdd?: boolean }) {
  const [data, setData] = useState<PracticesPayload | null>(null)
  /**
   * Resolved books, fetched only when a reading discipline is on screen.
   *
   * Once for the section rather than once per card, and never at all for
   * somebody with no reading practice — this renders on home, and an extra
   * request on every home open for a feature most people are not using is
   * exactly the kind of thing that turns into a bill.
   */
  const [books, setBooks] = useState<BookLite[]>([])
  const [adding, setAdding] = useState(false)
  const [planning, setPlanning] = useState<PracticeWire | null>(null)
  /** Which discipline's how-to is open. */
  const [guiding, setGuiding] = useState<PracticeWire | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadBooks = useCallback(() => {
    fetch('/api/books')
      .then(r => (r.ok ? r.json() : null))
      .then(payload => setBooks(payload?.reading ?? []))
      .catch(() => {})
  }, [])

  const load = useCallback(() => {
    fetch('/api/practices')
      .then(r => (r.ok ? r.json() : null))
      .then((payload: PracticesPayload | null) => {
        if (!payload) return
        setData(payload)
        // Only if there is something to read for.
        const reads = payload.practices.some(
          p => PRESETS_BY_KEY.get(p.presetKey)?.domain === 'read',
        )
        if (reads) loadBooks()
      })
      .catch(() => {})
  }, [loadBooks])

  useEffect(() => { load() }, [load])

  const log = async (practice: PracticeWire, done: boolean, minimumOnly = false) => {
    haptic(done ? 'medium' : 'light')
    setBusyId(practice.id)
    // Optimistic: the tap is the answer, and a slow network must not make
    // someone wonder whether it landed.
    setData(prev => prev && {
      ...prev,
      practices: prev.practices.map(p =>
        p.id === practice.id
          ? { ...p, state: done ? (minimumOnly ? 'minimum' : 'done') : 'missed' }
          : p,
      ),
    })
    try {
      await fetch('/api/practices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'log', practiceId: practice.id, done, minimumOnly }),
      })
      load()
    } catch {
      load()
    } finally {
      setBusyId(null)
    }
  }

  /** Retiring stops it being asked for. The logs stay — see server.ts. */
  const retire = async (practice: PracticeWire) => {
    haptic('light')
    setBusyId(practice.id)
    try {
      await fetch('/api/practices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retire', practiceId: practice.id }),
      })
      load()
    } catch {
      load()
    } finally {
      setBusyId(null)
    }
  }

  if (!data) return null

  const practices = data.practices
  if (practices.length === 0 && !canAdd) return null

  return (
    <>
      <div className="card-surface-lg p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-white/50">
            <Repeat2 className="w-3.5 h-3.5" /> Your disciplines
          </div>
          {canAdd && data.remaining > 0 && (
            <button
              onClick={() => { trackFeature('era', 'open', 'practice_add'); setAdding(true) }}
              className="flex items-center gap-1 text-[11px] text-white/70 rounded-full border border-white/[0.14] px-2 py-1 press-scale"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          )}
        </div>

        {practices.length === 0 ? (
          <>
            <p className="text-[17px] text-white leading-snug mt-2" style={{ ...SERIF, fontWeight: 500 }}>
              What do you already care about?
            </p>
            <p className="text-[13px] text-white/60 mt-1.5 leading-snug">
              The long-term things you stay consistent with — a gym split, ten pages a day, two
              hours of deep work. Voxu won&rsquo;t replace those apps; it keeps you showing up for
              them. Up to {data.max}.
            </p>
          </>
        ) : (
          <div className="mt-3 space-y-3">
            {practices.map(p => (
              <PracticeRow
                key={p.id}
                practice={p}
                busy={busyId === p.id}
                onLog={(done, minimumOnly) => log(p, done, minimumOnly)}
                onRetire={canAdd ? () => retire(p) : undefined}
                onEditPlan={canAdd ? () => setPlanning(p) : undefined}
                onGuide={() => setGuiding(p)}
                books={books}
                onBooksChanged={loadBooks}
                today={data.today}
              />
            ))}
            {canAdd && data.remaining === 0 && (
              <p className="text-[11px] text-white/35">
                Three at a time. Pause one to swap it — its record is kept.
              </p>
            )}
          </div>
        )}
      </div>

      {adding && <AddPracticeSheet onClose={() => setAdding(false)} onAdded={load} />}
      {guiding && (
        <PracticeGuideSheet
          presetKey={guiding.presetKey}
          label={guiding.label}
          onClose={() => setGuiding(null)}
        />
      )}
      {planning && (
        <PracticePlanSheet
          practice={planning}
          onClose={() => setPlanning(null)}
          onSaved={load}
        />
      )}
    </>
  )
}

function PracticeRow({
  practice,
  busy,
  onLog,
  onRetire,
  onEditPlan,
  onGuide,
  today,
  books,
  onBooksChanged,
}: {
  practice: PracticeWire
  busy: boolean
  /** Resolved books, for a reading practice. Empty for every other domain. */
  books: BookLite[]
  onBooksChanged: () => void
  /** The user's local day, for naming the next due one. */
  today: string
  onLog: (done: boolean, minimumOnly?: boolean) => void
  /** Only where practices are managed (/training), never on home. */
  onRetire?: () => void
  /** Opens the plan editor. Also only where they are managed. */
  onEditPlan?: () => void
  /** Opens the how-to for this discipline's domain. Everywhere, not just
   * where they are managed: the guidance is for the day, not for setup. */
  onGuide?: () => void
}) {
  const [confirmRetire, setConfirmRetire] = useState(false)
  /**
   * Which recovery option they picked, and which slot to show because of it.
   *
   * Deliberately view-only state: "do Monday instead" changes which list is
   * in front of them, not the record. The record is still one answer for
   * today, so there is no new per-day state to keep in step.
   */
  const [recoveryChoice, setRecoveryChoice] = useState<string | null>(null)
  const [shownSlot, setShownSlot] = useState<string | null>(null)
  /** The movement whose alternatives are open, if any. */
  const [movement, setMovement] = useState<Movement | null>(null)
  /** The typed title whose book sheet is open. */
  const [bookTitle, setBookTitle] = useState<string | null>(null)
  /** Whether to ask for the page, right after a reading day is marked done. */
  const [askingPage, setAskingPage] = useState(false)
  /** The detail, closed by default: the row is a daily answer, not a report. */
  const [open, setOpen] = useState(false)
  // "Change" reopens the three choices rather than flipping the answer:
  // a tap that silently turns a kept day into a missed one is a trap.
  const [editing, setEditing] = useState(false)
  const answered = !editing
    && (practice.state === 'done' || practice.state === 'minimum' || practice.state === 'missed')
  const choosing = editing || practice.state === 'due'

  // The moved-to day if they asked for one, otherwise today's.
  const movedItems = shownSlot ? practice.plan?.[shownSlot]?.items ?? [] : null
  const shownContent = shownSlot
    ? {
        slot: true,
        label: practice.recovery?.slotLabel ?? shownSlot,
        items: movedItems ?? [],
      }
    : {
        slot: !!practice.slot,
        label: practice.cue ?? practice.slot?.label ?? '',
        items: practice.todaysPlan?.items ?? [],
      }

  /** The book behind today's lines, if one has been resolved. */
  const isReading = PRESETS_BY_KEY.get(practice.presetKey)?.domain === 'read'
  const todaysBook = isReading
    ? bookForTitles(shownContent.items.map(i => i.name), books)
    : null

  const choose = (done: boolean, minimumOnly?: boolean) => {
    setEditing(false)
    onLog(done, minimumOnly)
    // The one moment the page number is known without having to remember it:
    // they have just put the book down. Asked AFTER the answer is recorded,
    // so ignoring it costs nothing — and never on "Not today", when there is
    // nothing to have read.
    if (done && todaysBook) setAskingPage(true)
  }

  return (
    <div className="rounded-xl border border-white/[0.12] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] text-white leading-snug truncate">{practice.label}</p>
          <p className="text-[11px] text-white/45 mt-0.5">
            {daysLabel(practice.days)} · minimum {practice.todaysMinimum}
          </p>
        </div>
        {/* Counts with their denominator in view — never a bare percentage. */}
        {practice.of > 0 && (
          <p className="text-[11px] text-white/45 tabular-nums shrink-0">
            {practice.done} of {practice.of}
          </p>
        )}
      </div>

      {/* The last seven days. Same language as the year grid on /proof:
          filled means kept, an outline means it was asked for and missed,
          and a faint dot is a day off. */}
      <div className="flex items-center gap-1 mt-2" aria-hidden>
        {practice.week.map(d => (
          <span
            key={d.day}
            title={d.day}
            className={`h-1.5 flex-1 rounded-full ${
              d.state === 'done' ? 'bg-white'
                : d.state === 'minimum' ? 'bg-white/60'
                : d.state === 'missed' ? 'bg-transparent border border-white/25'
                : d.state === 'due' ? 'bg-white/[0.18]'
                : 'bg-white/[0.07]'
            }`}
          />
        ))}
      </div>

      {/* After a missed session: scheduling answers, not a lecture. Never
          "you broke your streak", and never "do double today" — moving it,
          carrying on and doing the floor are all fine answers. Choosing one
          is a VIEW choice: it changes which list is shown, and the single
          Done / Minimum / Not today is still the only thing recorded. */}
      {practice.recovery && !answered && (
        <div className="mt-2.5 rounded-lg bg-white/[0.05] border border-white/[0.14] px-3 py-2.5">
          <p className="text-[13px] text-white/85 leading-snug">{practice.recovery.line}</p>
          {practice.recovery.options.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {practice.recovery.options.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => {
                    haptic('light')
                    setRecoveryChoice(opt.key)
                    if (opt.key === 'move' && practice.recovery?.slotKey) {
                      setShownSlot(practice.recovery.slotKey)
                    }
                  }}
                  className={`text-[12px] rounded-full px-2.5 py-1 border ${
                    recoveryChoice === opt.key
                      ? 'bg-white text-black border-white'
                      : 'border-white/20 text-white/75'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Their own plan for the day being shown — the exercises with whatever
          detail they typed, the run, the book. Shown, never graded, and
          never parsed: "3 x 8" is a note to themselves. */}
      {shownContent.slot && (shownContent.items.length > 0 || onEditPlan) && practice.state !== 'rest' && (
        <div className="mt-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] tracking-[0.18em] uppercase text-white/40">
              {shownContent.label}
            </p>
            {onEditPlan && (
              <button onClick={onEditPlan} className="text-[11px] text-white/45 hover:text-white/80">
                {shownContent.items.length > 0 ? 'Edit' : 'Add'}
              </button>
            )}
          </div>
          {shownContent.items.length > 0 ? (
            <ul className="mt-1 space-y-0.5">
              {shownContent.items.map((item, i) => {
                const matched = matchMovement(item.name)
                return (
                <li key={i} className="text-[13px] text-white/80 leading-snug flex justify-between gap-3">
                  {/* A recognised movement opens its alternatives. Read-only
                      here on purpose: swapping mid-session is for today, and
                      rewriting the day's list would change every future
                      Monday too. */}
                  {matched ? (
                    <button
                      onClick={() => { haptic('light'); setMovement(matched) }}
                      className="min-w-0 text-left flex items-center gap-1.5"
                    >
                      <span className="text-white/35 shrink-0">
                        <PatternGlyph pattern={matched.pattern} className="w-3.5 h-3.5" />
                      </span>
                      <span className="min-w-0 underline underline-offset-4 decoration-white/15">
                        {item.name}
                      </span>
                    </button>
                  ) : isReading && item.name.trim().length > 2 ? (
                    /* A reading line opens its book — whether or not one has
                       been resolved yet, because the sheet does both: it
                       shows the book if there is one and searches if there
                       is not.

                       Here rather than only in the plan editor, which is the
                       whole point: the editor is gated behind `onEditPlan`, and
                       `onEditPlan` is undefined on home. So the entire books
                       feature was unreachable from the screen people
                       actually open. */
                    <button
                      onClick={() => { haptic('light'); setBookTitle(item.name.trim()) }}
                      className="min-w-0 text-left flex items-center gap-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5 shrink-0 text-white/35" />
                      <span className="min-w-0 underline underline-offset-4 decoration-white/15">
                        {item.name}
                      </span>
                    </button>
                  ) : (
                    <span className="min-w-0">{item.name}</span>
                  )}
                  {item.detail && (
                    <span className="text-white/45 tabular-nums shrink-0">{item.detail}</span>
                  )}
                </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-[12px] text-white/35 mt-1">Nothing written for this one yet.</p>
          )}
        </div>
      )}

      {practice.state === 'rest' && !answered && (
        <p className="text-[12px] text-white/40 mt-2">
          Rest today.{' '}
          {practice.nextDue
            ? `${dayName(practice.nextDue, today)} you show up.`
            : 'Next one is up to you.'}
        </p>
      )}

      {/* A pattern used forwards. On a weekday with a real history of
          misses, this arrives BEFORE the day is spent and offers the floor
          — the useful answer to a hard day is a smaller ask, not a firmer
          tone. It never lowers the ask by itself: it says what it noticed
          and the choice below is still theirs. */}
      {choosing && practice.intervention && (
        <p className="text-[13px] text-white/80 mt-2 leading-snug rounded-lg bg-white/[0.05] border border-white/[0.12] px-3 py-2">
          {practice.intervention}
        </p>
      )}

      {choosing && (
        <>
          <p className="text-[13px] text-white/70 mt-2 leading-snug">
            {/* The minimum line is redundant once the intervention has
                already named it. */}
            {practice.intervention ? null : minimumLine({ ...practice, minimum: practice.todaysMinimum })}
          </p>
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={() => choose(true)}
              disabled={busy}
              className="flex-1 py-2 rounded-lg bg-white text-black text-[13px] font-medium disabled:opacity-40"
            >
              Done
            </button>
            <button
              onClick={() => choose(true, true)}
              disabled={busy}
              className="flex-1 py-2 rounded-lg border border-white/20 text-[13px] text-white disabled:opacity-40"
            >
              Just the minimum
            </button>
            <button
              onClick={() => choose(false)}
              disabled={busy}
              aria-label="Not today"
              className="px-3 py-2 rounded-lg border border-white/15 text-white/60 disabled:opacity-40"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {answered && (
        <div className="flex items-center justify-between gap-2 mt-2">
          <p className="text-[13px] text-white/70 flex items-center gap-1.5">
            {practice.state === 'missed' ? (
              <>
                Not today.{' '}
                {practice.nextDue
                  ? `${dayName(practice.nextDue, today)} you show up.`
                  : 'Back when you say so.'}
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                {practice.state === 'minimum' ? 'Minimum done — that still counts.' : 'Done.'}
                {practice.run > 1 && ` ${practice.run} in a row.`}
              </>
            )}
          </p>
          <button
            onClick={() => setEditing(true)}
            disabled={busy}
            className="text-[11px] text-white/40 hover:text-white/70 shrink-0"
          >
            Change
          </button>
        </div>
      )}

      {/* The detail, on a tap. Everything in here is something the app
          actually knows: the schedule, their floor, kept-of-due over four
          weeks, and — only once there is enough of it — the weekday they
          miss most, said as a count they can check against their own
          memory. No score, and no "Voxu strategy" it hasn't built.

          No longer gated on `onEditPlan`. That prop means "this surface can
          MANAGE practices", and it was doing double duty as "this surface
          can EXPLAIN them" — so on home you could not see your own
          schedule, your own floor, your record, or "How to do this well",
          whose own note says it should be everywhere because the guidance
          is for the day rather than for setup.

          Closed by default, so home gains one grey word per card and
          nothing else. The management action inside — Edit the plan — is
          still gated where it belongs. */}
      <>
          <button
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70 mt-2.5"
          >
            {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {open ? 'Less' : 'Details'}
          </button>

          {open && (
            <dl className="mt-2 space-y-1.5 text-[12px]">
              <Row label="Schedule" value={daysLabel(practice.days)} />
              <Row
                label="Next session"
                value={
                  practice.state === 'due'
                    ? 'Today'
                    : practice.nextDue
                      ? `${dayName(practice.nextDue, today)}${practice.cue ? ` · ${practice.cue}` : ''}`
                      : '—'
                }
              />
              <Row label="Your minimum" value={practice.minimum} />
              <Row
                label="Last four weeks"
                value={practice.of > 0 ? `${practice.done} of ${practice.of} kept` : 'Nothing due yet'}
              />
              {practice.run > 0 && <Row label="Current run" value={`${practice.run} in a row`} />}
              {onGuide && (
                <div className="pt-1">
                  <button onClick={onGuide} className="text-[12px] text-white/60 hover:text-white underline underline-offset-4 decoration-white/20">
                    How to do this well
                  </button>
                </div>
              )}
              {practice.weakDay && (
                <Row
                  label="Hardest day"
                  value={`Missed ${practice.weakDay.missed} of your last ${practice.weakDay.of} ${WEEKDAYS[practice.weakDay.weekday]}s`}
                />
              )}
            </dl>
          )}
      </>

      {onRetire && open && (
        confirmRetire ? (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
            <p className="text-[12px] text-white/70 flex-1">
              Pause this? Everything it recorded is kept.
            </p>
            <button
              onClick={() => { setConfirmRetire(false); onRetire() }}
              disabled={busy}
              className="text-[12px] text-white rounded-lg border border-white/20 px-2.5 py-1 disabled:opacity-40"
            >
              Pause it
            </button>
            <button
              onClick={() => setConfirmRetire(false)}
              className="text-[12px] text-white/50 px-1"
            >
              Keep
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmRetire(true)}
            className="text-[11px] text-white/30 hover:text-white/60 mt-2.5"
          >
            Pause this discipline
          </button>
        )
      )}

      {askingPage && todaysBook && (
        <PagePrompt
          bookId={todaysBook.id}
          title={todaysBook.title}
          pages={todaysBook.pages}
          currentPage={todaysBook.current_page}
          onDone={() => { setAskingPage(false); onBooksChanged() }}
        />
      )}

      {movement && <MovementSheet movement={movement} onClose={() => setMovement(null)} />}
      {bookTitle && (
        <BookSheet
          title={bookTitle}
          onClose={() => setBookTitle(null)}
          onChanged={onBooksChanged}
        />
      )}
    </div>
  )
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** One line of the detail: label left, fact right. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-white/40">{label}</dt>
      <dd className="text-white/80 text-right">{value}</dd>
    </div>
  )
}