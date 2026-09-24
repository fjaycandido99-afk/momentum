# Era continuity — Project Scope

**The problem:** day 31 has amnesia. You spend 30 days promising something
daily, the app says *"You finished your Locked In. You kept 24 of 28
promises"*, gives you the Recap, and then offers **"Start your next era"** —
which begins at day 1 with no memory of the last one. Nothing carries. The
thing you just proved you could do for a month is not offered a way to
continue, and the app never tells you it was your third era.

Voxu already has the right answer to "is 30 days enough?" — it's
**disciplines**: the things you keep for months, with their own schedule and
floor. The gap is that nothing connects the two. An era ends and a discipline
is never suggested, even though the era was a 30-day rehearsal for exactly
that.

---

## What already exists (don't rebuild)

- `step: 'complete'` → the report card, the Era Recap (premium, generated once
  and stored), and a "Start your next era" link. `lib/era/service.ts`.
- `startEra` sets the previous era to `status: 'ended'`, so eras are already a
  sequence in the DB — `Era` rows with `ended_at`.
- `gatherEraAchievementStats` computes `erasStarted`, `erasCompleted`,
  `perfectEras`, `comebacks`. **None of these is shown to the user anywhere.**
- `EraPromise` rows keep `text`, `kept`, `local_day`, `confidence` for every
  day of every era.
- Practices: `MAX_PRACTICES = 3`, `PRACTICE_LIMITS` 40 chars for label and
  minimum, `presetKey` drives domain, and every domain now has a "Something
  else" preset (`<domain>_custom`).

---

## The finding that decides the design

**An era cannot be converted into a discipline mechanically.** Two reasons,
both structural:

1. **A promise is different every day; a discipline is one recurring thing.**
   The era's whole shape is "one promise a day, in your own words". There is
   no single repeating item to promote. Anything the app picked would be a
   guess about which of 30 different sentences was the real one.
2. **Only 2 of the 8 eras map to a practice domain.** `gym_arc` → gym,
   `study` → study. The other six — `locked_in`, `discipline`, `comeback`,
   `stoic_mode`, `confidence`, `five_am` — describe *how* you behave, not
   *what* you do. There is no domain to put them in.

So the conversion has to be a **choice the person makes**, seeded with their
own words, never an inference. That is the difference between this being
useful and it being the app telling somebody what their habit was.

---

## Part 1 — Keep one thing (the main piece)

At `step: 'complete'`, beside "Start your next era":

> **Keep one thing from this**
> Thirty days is a push. A discipline is what you keep.

Tapping it opens the existing `AddPracticeSheet`, pre-seeded:

| Field | Seeded from | Notes |
|---|---|---|
| domain | era key where it maps, else unset | `gym_arc`→gym, `study`→study; the other six ask, as they do today |
| label | the era's title, editable | "Locked In" is a fine discipline name if they keep it |
| minimum | **empty** | Theirs to write. The era had no minimum concept; inventing one would be the app setting their floor |
| days | every day | What the era actually was |

**Their promises, to pick from.** Under the label field, the distinct promises
from that era, most-repeated first, as tappable chips. Tapping one fills the
label. This is the honest version of "what was the recurring thing?" — the
app shows them their own thirty days and they point at it.

Counting repeats is exact-match on trimmed, lowercased text. No fuzzy
grouping: "gym" and "go to the gym" stay separate, because merging them is
the app deciding they meant the same thing.

**If they already have 3 disciplines**, say so and offer the swap that
`PracticesSection` already has ("Pause one to swap it — its record is kept")
rather than silently failing at the cap.

### Explicitly NOT doing
- No AI-generated discipline suggestion. The Recap is the place for the
  model's read on the era; a habit somebody will be asked about daily for
  months is not.
- No auto-creating the discipline. An era ending must not add a standing
  daily commitment nobody agreed to.
- **No analysing promise text for insight.** Showing somebody their own
  promises back to themselves is a product feature; reading promise text to
  learn things about users is forbidden by the privacy policy.

---

## Part 2 — Say which era this is

`erasCompleted` is already computed and never shown. On the complete card:

> Your **third** era. 24 of 28 kept.

And on the era picker, when they have finished one before, the count instead
of a cold start. One line each, no new data, no new query — it comes from the
stats that already exist.

### NOT doing
No cross-era streak, no "eras in a row", no total-days-kept-across-all-eras
number. An era ending and a gap before the next one is normal and healthy;
a counter that resets on that gap would punish a rest week. Same reasoning
that keeps a score off the practice cards.

---

## Part 3 — The gap between eras (smallest piece)

Between eras there is no era, and home shows `StartHero`. Now that
disciplines render there too, someone between eras still has something to do —
so this part may already be enough. Worth looking at after Parts 1 and 2 ship
rather than designing now.

---

## Decisions needed from Francis

1. **Does "Keep one thing" appear for everyone, or only after a decent era?**
   A 4-of-28 era ending with "keep this going" may land badly. Options: always;
   or only when `keptPercent` clears some bar; or always but with different
   copy when it went badly. I lean **always, with the copy unchanged** — the
   offer is about what happens next, not a verdict on the month.
2. **Does the promise-chip list go behind memory consent?** It is their own
   text shown back to them in their own session, which is what the Recap
   already does — so I read it as not needing a separate gate. Worth you
   confirming, because it is promise text.
3. **Part 2's wording: "third era" or "third era finished"?** They differ for
   somebody on their third *attempt* who finished one.

---

## Cost

Nothing recurring. No new model calls, no new cron, no new table. One extra
query at day 30 (distinct promises for that era, capped), and one read of
stats already computed. Part 2 is presentational.

## Order

Part 2 first — it is two lines of copy over data that already exists, and it
makes the era feel like a sequence immediately. Then Part 1, which is the real
feature. Part 3 last, or never.
