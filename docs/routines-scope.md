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

1. Schema + pure logic (times, weekday validation, the notification id map)
2. API + the /training section
3. Native scheduling on save, and on app open (in case the OS dropped them)
