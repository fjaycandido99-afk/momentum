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

## Subjects — Era (the core loop, do these first)

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
