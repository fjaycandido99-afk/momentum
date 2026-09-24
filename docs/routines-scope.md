# Routines — Project Scope

**What it is:** a thing you do, at a time you pick, that reminds you. "Read
before bed, 21:30." "Phone out of the room, 22:00." "Gym bag by the door,
07:00." Any routine, named by them, with a notification that arrives.

**The fact that makes it worth building:** `scheduleReminder` in
`lib/notifications.ts` uses Capacitor **LocalNotifications** — it fires on the
device, repeating at an hour/minute/weekday, with **no push server, no VAPID,
no FCM and no subscription**. Push currently reaches 1 of 13 users. A local
notification reaches anyone with the native app immediately. This is the first
feature where being in the app is worth something the web cannot do.

---

## Not the thing that was deleted

The old `RoutineBuilder` (removed 2026-09-23, commit b043a35) was an **audio
playlist**: pick from seven hardcoded options — Focus Soundscape, Lo-Fi,
Piano, Motivation — order them, and a `RoutinePlayer` played them back to
back. By the end no screen could reach it. Nothing here resembles it, and the
`Routine`/`RoutineStep` tables it used stay dropped.

## Not a second habit tracker

This is the line that decides whether the feature helps or confuses.

**A discipline RECORDS.** Days of the week, a minimum that still counts, and
one answer a day — done, the minimum, or not today — kept for months with a
run and a weakest weekday.

**A routine REMINDS.** A name, a time, and a notification. It keeps no record,
has no streak, and cannot be missed.

If routines also recorded, Voxu would have two habit systems and every user
would face "which one do I put this in?" — and the answer would be arbitrary.
So: if you want to be asked whether you did it, that is a discipline. If you
want to be told when to, that is a routine. The app should say as much when
somebody adds one.

## What it holds

Francis's fuller version (2026-09-23, with home screenshots): the routine is
the **container for the day**, not just a standalone cue. Home shows Today's
Audio, Today's Mission, Today's Promise, today's exercise and the disciplines
as a fixed stack in a fixed order, and "putting all this as part of their
routine makes more sense if they want that". So a step can point at something
the app already has, at a time they choose:

| Step kind | Points at |
|---|---|
| `audio` | Today's Audio — the session for that time of day |
| `promise` | Making today's promise |
| `exercise` | Today's one guided exercise |
| `practice` | One of their disciplines, by id |
| `journal` | Writing today's entry |
| `reset` | Nervous-System mode |
| `own` | Their own words, nothing to open |

Each step: a kind, an optional reference, a time, and that is all.

| Routine field | Notes |
|---|---|
| `label` | Their words, 40 chars, same cap as a discipline |
| `days` | Weekdays, empty = every day, same convention as `Practice.days` |
| `enabled` | Off without deleting, same as a practice being paused |

Capped at **one routine of 8 steps**. A day has more than five moments in it,
but past eight the reminders stop being read — the same reasoning that caps
disciplines at 3.

### What makes this different from the builder that died

The deleted one had steps too, and nobody used it. Two reasons this is not
that:

- **It has times, and times are the point.** The old builder ordered audio
  with no notion of when. Ordering without time is a playlist; ordering WITH
  time is a day.
- **It points at the things people actually do.** The old one could only
  reference seven audio tracks. This references the promise, the exercise and
  their own disciplines — the things they already open the app for.

### NOT reordering home

The tempting next step is to let the routine drive the home stack. Deferred,
deliberately: home is the screen everything else depends on, and a feature
that rearranges it before anyone has built a routine risks breaking the
default for the many to serve the few. The routine gets its own surface
first. If people build them, home can follow.

## The era connection

The notification body can carry the era's ask when one is running — the point
he raised. Kept simple: the routine's own name is the title, and the body
names the era only when there is one. Never invented copy about what they
should do; the routine's name already says that.

## Delivery

- **Native:** `scheduleReminder` per routine, ids 9000+ to stay clear of
  `NOTIFICATION_IDS` (1–8). Rescheduled whenever a routine changes, and
  cancelled on delete or disable.
- **Web:** silent. A web user can still create routines and see them, and the
  app says plainly that reminders need the app rather than pretending.
  Faking it with a setTimeout that dies when the tab closes would be worse.
- **Permission:** reuses the existing ask — `ReminderAsk` and the Settings
  toggle already handle it.

## Where it lives

`/training`, under the disciplines. That is where somebody is already deciding
what their days contain, and it is the page Francis had in mind ("we are
already at era training, it should be part of that").

## Francis's fuller spec, and what was taken from it

His 2026-09-23 spec: `Era = who you're becoming · Routine = the structure
that supports it · Practice = the repeated behaviour · Mission = what matters
today`. Era presets seed a routine; blocks carry a goal AND a minimum; Routine
Modes (Full / Minimum / Recovery / Travel) let the day shrink instead of
breaking. **"Never break the identity. Shrink the routine when needed."**

Taken, all of it, with three changes:

**1. The routine does NOT become a second tracker — it is where disciplines
get a time.** His spec has blocks recording ("you've completed 4 of your last
5 mornings", "do the 5-page minimum"). A block with a minimum, days and
completion IS a discipline; building it separately would make disciplines
redundant and ask every user "which do I put this in?". So a block pointing at
a discipline borrows that discipline's minimum and its record. One habit
system, two views of it. The earlier "reminds, never records" line was right
about not duplicating and wrong about how to avoid it.

**2. Durations are their words, not targets.** "Deep Work 90 min" is stored
and shown; it is never parsed into a number the app measures against. Same
contract as `Practice.plan` and `Practice.minimum` — Voxu writes no programmes
and reads no set, rep or load.

**3. The 3-discipline cap stays, and blocks are not all disciplines.** His
Locked In morning has five blocks, which would break a cap of three. The cap
is there so nobody collects habits they never keep, which is worth keeping —
so a block is one of: a pointer to one of their ≤3 disciplines, an app thing
(audio, promise, exercise, journal, reset), or their own words with its own
minimum. That morning fits with nothing stretched.

Deferred, not rejected: **relative rules** ("after another habit", "before
bedtime") are a dependency graph and cost far more than times for less;
**drag-reorder** waits, since the list sorts by time and time is the order.

## Decisions taken

1. **Cue, not record** — see above. The strongest opinion in this document.
   A step has a time and a reminder; it never asks whether you did it.
2. **Local notifications, not push.** Push needs a subscription 12 of 13 users
   do not have; a local notification needs the app to have been opened once.
3. **One routine, not many.** A person has one day. Several competing routines
   is the same trap as several competing habit systems, and "which routine is
   this in?" is a question nobody should have to answer.
4. **Home is not reordered by it.** Not yet — see above.

## Cost

One table, no recurring cost, no model calls, no cron. Scheduling happens on
the device.

## Order

1. **Schema + pure logic** — times, validation, the notification id map. DONE.
2. **Blocks with times, on a timeline, referencing disciplines.** API + the
   /training section. No drag, no modes.
3. **Era presets that seed it** — the thing that stops it opening blank, which
   is what killed the last builder.
4. **Minimum Day mode.** The strongest idea in the spec and cheap once every
   block carries a minimum: one switch, and the day shows floors instead of
   goals. Never breaks the routine.
5. Native scheduling on save and on app open (in case the OS dropped them).
6. Drag, the other modes, adaptive nudges.
