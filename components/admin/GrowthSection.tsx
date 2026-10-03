'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { GrowthData } from '@/lib/analytics/growth-server'
import type { PatternLine, Rate } from '@/lib/analytics/growth'

/**
 * Growth & patterns (lib/analytics/growth): Voxu as a whole, for the
 * founder. Totals only — a line with fewer than 5 people behind it says so
 * instead of showing a number. Every rate carries its counts, and every
 * card says what moves the number, so it reads as something to act on.
 */

function Pct({ r }: { r: Rate | null }) {
  if (!r) return <span className="text-white/40 text-sm">Not enough people yet</span>
  return (
    <span>
      <span className="text-xl font-bold text-white tabular-nums">{r.rate}%</span>
      <span className="text-px-11 text-white/50 ml-1.5 tabular-nums">{r.hits} of {r.of}</span>
    </span>
  )
}

function Card({ title, moves, children }: { title: string; moves: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white/80">{title}</h3>
      {children}
      <p className="text-px-11 text-white/55 leading-snug border-t border-white/5 pt-2">
        <span className="text-white/70">What moves this: </span>{moves}
      </p>
    </div>
  )
}

/** A row: label, then a count. */
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-baseline py-2 text-xs gap-3">
      <span className="text-white/75">{label}</span>
      <span className="text-white tabular-nums text-right">{value}</span>
    </div>
  )
}

function StepRate({ r }: { r: Rate | null }) {
  return r ? <span className="text-white/45"> · {r.rate}% of the step before</span> : <span className="text-white/35"> · rate after 5 people</span>
}

function Lines({ lines, empty }: { lines: PatternLine[]; empty: string }) {
  if (lines.length === 0) return <p className="text-white/40 text-sm">{empty}</p>
  return (
    <div className="divide-y divide-white/5">
      {lines.map(l => (
        <div key={l.label} className="flex justify-between items-baseline py-2 text-xs gap-3">
          <span className="text-white/75 capitalize">{l.label}</span>
          <span className="text-white tabular-nums">
            {l.result.rate}% <span className="text-white/45">· {l.result.hits} of {l.result.of} · {l.people} people</span>
          </span>
        </div>
      ))}
    </div>
  )
}

export function GrowthSection({ apiKey = null }: { apiKey?: string | null }) {
  const [g, setG] = useState<GrowthData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const url = apiKey ? `/api/analytics/growth?key=${encodeURIComponent(apiKey)}` : '/api/analytics/growth'
    fetch(url, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setG)
      .catch(() => setError(true))
  }, [apiKey])

  if (error) return <p className="text-white/50 text-sm">Growth & patterns couldn’t load.</p>
  if (!g) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-white/40" /></div>

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-white">Growth & patterns</h2>
        <p className="text-px-11 text-white/50">
          Totals across all {g.people} people. Nobody’s words, no single person’s record; a line with fewer than 5 people behind it stays hidden.
        </p>
      </div>

      <Card title="Coming back" moves="the first session landing (an era started on day 1, a promise kept on day 1), a reason to return tomorrow (the 8pm check-in, the morning promise), and push actually reaching people — today only a couple of devices can receive it.">
        <div className="grid grid-cols-3 gap-3">
          {g.retention.map(r => (
            <div key={r.day} className="bg-white/[0.03] rounded-lg p-3">
              <div className="text-px-10 text-white/50 uppercase tracking-wider mb-1">Day {r.day}</div>
              <Pct r={r.result} />
            </div>
          ))}
        </div>
      </Card>

      <Card title="Eras" moves="where people stall. If most drop in week 1, the first days ask too much (promise size, missions); week 2–3 is the slump the comeback flow and Rescue exist for. Second eras rise with 'What stays with you?' and the era record.">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <div><div className="text-px-10 text-white/50 uppercase tracking-wider">Completed</div><Pct r={g.eras.completion} /></div>
          <div><div className="text-px-10 text-white/50 uppercase tracking-wider">Started a 2nd era</div><Pct r={g.eras.secondEra} /></div>
        </div>
        {g.eras.dropWeeks && (
          <div className="flex gap-2 text-xs">
            {g.eras.dropWeeks.map(w => (
              <span key={w.week} className="px-2 py-1 rounded bg-white/[0.04] text-white/75">Dropped in week {w.week}: {w.count}</span>
            ))}
          </div>
        )}
      </Card>

      <Card title="Disciplines still alive after 4 weeks" moves="the size of the minimum (small floors survive), a set time, and the missed-day recovery prompt. A discipline with no time and a big minimum is the one that quietly stops.">
        <Pct r={g.disciplines.alive} />
      </Card>

      <Card title="What people did in their first 3 days" moves="this is a correlation, not a cause: people who were going to stay may simply do more. Use it to choose what onboarding points at first, then watch whether retention moves.">
        {g.beforeStaying ? (
          <div className="divide-y divide-white/5">
            {g.beforeStaying.map(f => (
              <div key={f.feature} className="flex justify-between py-2 text-xs gap-3">
                <span className="text-white/75 capitalize">{f.feature}</span>
                <span className="text-white/60 tabular-nums">stayed {f.stayed.rate}% · left {f.left.rate}%</span>
              </div>
            ))}
          </div>
        ) : <p className="text-white/40 text-sm">Needs 5 people who stayed and 5 who left.</p>}
      </Card>

      <Card title="Notifications" moves="the time it lands (sends cluster before 9 AM and after 6 PM), whether it is about something they did (their promise) rather than generic, and how many devices can receive push at all.">
        <div className="divide-y divide-white/5">
          {g.notifications.byType.slice(0, 8).map(t => (
            <div key={t.type} className="flex justify-between py-2 text-xs gap-3">
              <span className="text-white/75">{t.type}</span>
              <span className="text-white/60 tabular-nums">{t.result ? `${t.result.rate}% opened · ${t.result.hits} of ${t.result.of}` : `${t.people} ${t.people === 1 ? 'person' : 'people'} — not enough yet`}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {g.notifications.sentByHour.map(h => (
            <span key={h.label} className="px-2 py-1 rounded bg-white/[0.04] text-white/70">{h.label}: {h.sent} sent</span>
          ))}
        </div>
      </Card>

      {/* What shipped recently — is anyone using it, and where do they stop? */}
      <Card title="First launch (the talking opener)" moves="the first seconds: Voxu speaking and listening on open, how fast the reply lands, and whether the three eras feel like them. A big drop at 'answered' means the voice/listen step is failing or awkward; at 'era', the suggestions miss; at 'promise', the promise asks too much.">
        <div className="divide-y divide-white/5">
          <Row label="Began" value={`${g.newFeatures.opener.began} people`} />
          <Row label="Answered the question" value={<>{g.newFeatures.opener.answered}<StepRate r={g.newFeatures.opener.rates.answered} /></>} />
          <Row label="…of those, without the AI (fallback)" value={g.newFeatures.opener.answeredFallback} />
          <Row label="Started an era" value={<>{g.newFeatures.opener.startedEra}<StepRate r={g.newFeatures.opener.rates.era} /></>} />
          <Row label="Made the first promise" value={<>{g.newFeatures.opener.firstPromise}<StepRate r={g.newFeatures.opener.rates.promise} /></>} />
        </div>
        {g.newFeatures.opener.eraPicks.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            {g.newFeatures.opener.eraPicks.map(p => (
              <span key={p.key} className="px-2 py-1 rounded bg-white/[0.04] text-white/70">{p.key}: {p.people}</span>
            ))}
          </div>
        )}
      </Card>

      <Card title="Voxu Guide (the orb)" moves="being found — the orb's first-visit question, and the orb now replacing search on Today. Many 'didn't know where to go' asks mean the place list needs more words people actually say.">
        <div className="divide-y divide-white/5">
          <Row label="Explain this page" value={`${g.newFeatures.voice.explain.people} people · ${g.newFeatures.voice.explain.plays} plays`} />
          <Row label="Take me somewhere / do this" value={`${g.newFeatures.voice.navigate.people} people · ${g.newFeatures.voice.navigate.asks} asks · ${g.newFeatures.voice.navigate.unknown} not understood`} />
          <Row label="Talk it through" value={`${g.newFeatures.voice.talk.people} people · ${g.newFeatures.voice.talk.opens} conversations`} />
        </div>
        {g.newFeatures.voice.byScreen.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            {g.newFeatures.voice.byScreen.map(x => (
              <span key={x.screen} className="px-2 py-1 rounded bg-white/[0.04] text-white/70">{x.screen}: {x.plays}</span>
            ))}
          </div>
        )}
      </Card>

      <Card title="Psychology lessons" moves="the 'For you' row (lessons tied to someone's own laws) and the links from Your laws and experiments. Lessons nobody opens are candidates for a better title, not deletion.">
        <div className="divide-y divide-white/5">
          <Row label="Opened the library" value={`${g.newFeatures.lessons.libraryOpeners} people`} />
          <Row label="Read a lesson" value={`${g.newFeatures.lessons.readers} people · ${g.newFeatures.lessons.reads} reads`} />
          {g.newFeatures.lessons.top.map(l => <Row key={l.id} label={l.id} value={`${l.readers} readers`} />)}
        </div>
      </Card>

      <Card title="Experiments, relic notes" moves="experiments: having a law to test (they start from Your laws) and the setup screen. Notes: the 'Add a memory' link in the relic popup — notes are private, so this counts that they exist, never what they say.">
        <div className="divide-y divide-white/5">
          <Row label="People who started an experiment" value={g.newFeatures.experiments.people} />
          <Row label="Started · finished · stopped · running" value={`${g.newFeatures.experiments.started} · ${g.newFeatures.experiments.finished} · ${g.newFeatures.experiments.stopped} · ${g.newFeatures.experiments.running}`} />
          {g.newFeatures.experiments.byKind.map(k => <Row key={k.kind} label={k.kind} value={`${k.started} started`} />)}
          <Row label="Relic memories written" value={`${g.newFeatures.relicNotes.notes} by ${g.newFeatures.relicNotes.people} people`} />
        </div>
      </Card>

      <Card title="Best time to promise (everyone)" moves="when people make the promise. Morning promises are made before the day gets in the way; nudging the promise step earlier (the morning push, the wake-up call) is the lever.">
        <Lines lines={g.patterns.timing} empty="Not enough people yet." />
      </Card>

      <Card title="Guided days vs other days (everyone)" moves="nothing proven — these happen together (a good day brings both). If the gap holds as numbers grow, it is worth testing whether offering the guide before the promise moves keeping.">
        <Lines lines={g.patterns.guided} empty="Not enough people yet." />
      </Card>

      <Card title="Disciplines by type (everyone)" moves="the type's own friction (gym needs travel, reading doesn't) and the minimums people pick for it. A type that lags is where better default minimums and presets help.">
        <Lines lines={g.patterns.disciplineTypes} empty="Not enough people yet." />
      </Card>
    </section>
  )
}
