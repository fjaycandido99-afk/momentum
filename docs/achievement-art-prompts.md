# Achievement badge art — prompts

Each badge can have its own coin (`ACHIEVEMENT_BADGE_IMAGES` in
`lib/achievements.ts`); without one it shows its category's coin.

## How to make one

1. Paste the **style prompt** below into ChatGPT, then add the badge's **subject**.
2. Square output. Keep it **black-and-white**: the app tints the metal itself —
   steel for common, silver for rare, gold for epic and legendary — so a gold
   or coloured image would fight the tint.
3. Save as `public/achievements/<id>.jpg` (264×264 is enough; Claude can
   resize and compress it), then add `'<id>': '/achievements/<id>.jpg'` to
   `ACHIEVEMENT_BADGE_IMAGES`. The test fails if the file is missing.

Watch for: a painted checkerboard instead of real black, text or numbers on
the coin (the app stamps the number itself), and the symbol drifting to the
bottom edge — a number plate covers the foot of the coin.

## Style prompt (use for every badge)

> A single round antique coin, front view, perfectly centred on a pure black
> background. Hand-struck dark silver metal with a worn, textured surface and
> a raised beaded rim. In the centre, one symbol carved in deep relief:
> **[SUBJECT]**. Dramatic soft light from the upper left, deep shadows,
> monochrome greyscale only, no colour. The symbol sits in the middle two-thirds
> of the coin, with nothing near the bottom edge. No text, no letters, no
> numbers, no border outside the coin. Photorealistic, high detail.

## Subjects — one coin per era (do these first)

Earned by finishing that era. **All nine are made** (2026-10-01) and live as
`public/achievements/era_done_<key>.jpg`. Also done: the rest of the Era list
below from Second Chapter on, and every legendary.

**No real living person's likeness** — the Hustler portrait once resembled a
real athlete and had to go. Marcus Aurelius is a historical figure from
Roman statuary and is fine; the Gym Arc athlete must be anonymous.

| id | Era | Subject |
|---|---|---|
| era_done_locked_in | Locked In | a hooded figure bent over a desk under a single hanging lamp, seen from behind |
| era_done_discipline | Discipline Era | two hands pulling tight the laces of a worn running shoe |
| era_done_comeback | Comeback Season | a lone figure walking up a long straight road toward a rising sun |
| era_done_gym_arc | Gym Arc | a powerfully muscular anonymous athlete locking out a heavy deadlift, face turned away in shadow, like a Greek statue |
| era_done_stoic_mode | Stoic Mode | a bust of the Roman emperor Marcus Aurelius in profile, bearded, as on a Roman coin |
| era_done_confidence | Confidence Mode | a lion's head facing forward, mane spread, calm and steady |
| era_done_study | Study Era | an open book beside a lit candle, a thin trail of smoke rising |
| era_done_five_am | 5AM Era | the sun half-risen over a city skyline, rays spreading upward |
| era_done_custom | Your Own Era | a quill writing on an unrolled blank scroll |

## Subjects — Era (the core loop)

| id | Badge | Subject |
|---|---|---|
| era_first_promise | Said Out Loud | an open mouth exhaling a curl of breath shaped like a ribbon |
| era_first_kept | Word Kept | a wax seal pressed onto a folded letter |
| era_custom | Author | a quill pen resting across an open blank page |
| era_comeback | The Answer | a single footprint stepping forward out of a shadow |
| era_kept_7 | Seven Kept | seven small stones stacked into a cairn |
| era_streak_7 | Unbroken Week | seven linked rings forming a short chain |
| era_kept_25 | Person of Your Word | two hands clasped in a handshake |
| era_complete | Era Complete | a mountain summit with a small flag at its peak |
| era_second | Second Chapter | an open book with a ribbon bookmark between two chapters |
| era_reflection | In Your Own Words | a fountain pen nib above a single written line |
| era_carried | What Stayed | a small sapling held in two cupped hands |
| era_carried_3 | Built to Last | three stone pillars holding up one arch |
| era_return | Came Back to It | a sun rising over a path that leads back toward the viewer |
| era_comeback_5 | Always Comes Back | a boomerang mid-flight on a curved trail |
| era_streak_30 | Thirty Unbroken | a long heavy chain coiled in a full circle |
| era_kept_50 | Fifty Kept | an old iron key and a padlock, the lock open |
| era_three | Three Eras | three standing stones in a row, tallest in the middle |
| era_kept_100 | A Hundred Kept | an ornate old key with a crown-shaped bow |
| era_five | Five Chapters | a closed leather-bound book with five raised bands on its spine |
| era_flawless | Flawless Era | a cut diamond with clean facets, radiating thin lines |

## Subjects — the hardest ones (legendary)

| id | Badge | Subject |
|---|---|---|
| practice_kept_100 | A Hundred Days | a stone statue of a seated figure, weathered but whole |
| practice_run_30 | Thirty Straight | a mountain range with a single unbroken trail along its ridge |
| proof_365 | A Year of Proof | an ancient clay urn with a ring of tiny marks around its body |
| streak_365 | Year of Growth | a full oak tree with a wide crown and deep roots |
| listener_100hr | Audio Legend | an old gramophone horn with sound waves rising from it |
| perfect_week | Perfect Week | seven small stars arranged in a perfect circle |

## Subjects — new this week (when there's time)

| id | Badge | Subject |
|---|---|---|
| practice_floor_10 | Holds the Floor | a single brick foundation course, level and solid |
| practice_back_5 | Back Every Time | a figure climbing back up a rope |
| reset_first | Came Down | a single wave settling into a flat calm sea |
| reset_helped | It Helped | a leaf floating on still water, one ripple around it |
| reset_10 | Steady Hands | two open hands held level, palms down |
| proof_7 | A Week of Proof | a small scroll tied with a cord |
| proof_30 | Thirty Days of Proof | a grid of small square tiles, every one marked with a carved notch |
| proof_100 | A Hundred Days of Proof | an unrolled scroll covered in tally marks |

## Subjects — everything else

### Disciplines

| id | Badge | Subject |
|---|---|---|
| practice_first_kept | Kept It | a single smooth river stone resting on an open palm |
| practice_floor | The Floor | one solid brick laid level on bare ground |
| practice_kept_10 | Ten Days In | a short row of footprints pressed into wet sand |
| practice_back_on | Back On It | a hand gripping the next rung of a ladder |
| practice_run_7 | A Week Straight | a straight row of fence posts receding into the distance |
| practice_run_14 | Fourteen Straight | a long stone bridge with many arches in an unbroken line |
| practice_three | Three Disciplines | three interlocking iron rings |
| practice_kept_30 | Thirty Kept | a neat stack of split firewood logs |

### Mindset exercises

| id | Badge | Subject |
|---|---|---|
| exercise_first | Sat With It | a figure seated cross-legged, eyes closed, hands resting on knees |
| exercise_10 | Ten Sessions | a lotus flower opening on still water |
| exercise_variety_5 | Range | an open fan with its ribs spread wide |
| exercise_50 | Fifty Sessions | a tall pine tree standing alone on a hillside |
| exercise_days_30 | Thirty Days of It | a full moon above calm water, its reflection below |

### Books

| id | Badge | Subject |
|---|---|---|
| book_first | Finished It | a closed book with a ribbon bookmark hanging from the last page |
| book_5 | Five Books | a short stack of books lying flat, spines facing out |
| book_12 | A Book a Month | a tall bookshelf, every shelf full |

### Streaks

| id | Badge | Subject |
|---|---|---|
| streak_3 | Getting Started | a small flame just catching on a match head |
| streak_7 | Week Warrior | a steady candle flame |
| streak_14 | Two Week Titan | a torch with a strong upright flame |
| streak_30 | Monthly Master | a campfire burning in a ring of stones |
| streak_60 | Unstoppable | a lit lighthouse beam cutting through dark sky |
| streak_100 | Century Club | a blazing forge with sparks rising |

### Journal, mood, goals

| id | Badge | Subject |
|---|---|---|
| first_journal | Dear Diary | a closed leather journal tied with a cord |
| journal_7 | Journaling Habit | an open journal with lines of handwriting (no readable words) |
| journal_30 | Journaling Pro | a stack of filled journals tied together with string |
| mood_tracker | Self-Aware | a face in profile with a small spiral above the brow |
| breathing_10 | Breathe Deep | a soft gust of wind curling into a spiral |
| goal_complete | Goal Getter | an arrow struck dead centre in a target |

### Audio and listening

| id | Badge | Subject |
|---|---|---|
| first_soundscape | Sound Explorer | a seashell spiral with sound lines curving out of it |
| genre_explorer | Genre Explorer | a compass rose with a small musical note at its centre |
| genre_explorer_audio | Sound Seeker | a pair of old headphones resting on a stone |
| all_genres | Genre Master | a lyre with every string intact |
| listener_1hr | First Hour | an hourglass with all the sand run through |
| listener_5hr | Dedicated Listener | a vinyl record with its grooves catching the light |
| listener_10hr | Sound Devotee | a tuning fork vibrating, faint waves around it |
| flow_master | Flow Master | a river winding smoothly between two banks |
| deep_flow | Deep Flow | a deep ocean wave curling, seen from the side |
| listening_streak_7 | Weekly Listener | a small bell hanging from a curved bracket |
| listening_streak_30 | Monthly Listener | a large temple bell with a wooden striker beside it |

### Daily sessions

| id | Badge | Subject |
|---|---|---|
| early_bird | Early Bird | a songbird perched on a branch against a rising sun |
| night_owl | Night Owl | an owl perched on a branch under a crescent moon |
| full_day_5x | All-In | a sundial with its shadow sweeping the full dial |
| weekend_warrior | Weekend Warrior | a round shield with a single raised boss |
| modules_50 | Module Machine | a set of interlocking gears turning together |
| all_modules | Full Experience | a compass with all four points lit |

### XP and levels

| id | Badge | Subject |
|---|---|---|
| xp_500 | Rising Star | a single star rising above a horizon line |
| xp_2000 | XP Collector | a cluster of stars forming a small constellation |
| xp_5000 | XP Legend | a comet streaking across the night sky |
| level_5 | Warrior Status | a crossed sword and shield |

### Secret

| id | Badge | Subject |
|---|---|---|
| midnight_owl | Midnight Owl | a clock face with both hands pointing straight up, no numerals |
| midnight_listener | Midnight Listener | a crescent moon cradling a single musical note |
