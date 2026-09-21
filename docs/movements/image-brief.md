# Movement art — exact prompts

The movement screen has a hero slot. Until art exists it draws the pattern
mark, which is fine but plain. This fills it.

## Two rules before the prompts

**1. No text inside the image.** The mockup's arrows and labels
("Brace core", "Control the descent") are drawn by the app, overlaid on top
of the picture from `technique.callouts`. That means a cue can be
corrected, translated or withdrawn without regenerating anything — and no
image model gets to spell a coaching cue. Every prompt below ends in
`no text, no labels, no watermark` for that reason.

**2. A figure in shadow, not a form reference.** Image models produce
confident-looking lifts with the knees collapsing or the bar behind the
heels. On a screen headed with an exercise name that reads as "this is how
it looks", which is form instruction nobody checked. So the figure set is
deliberately low-key and rim-lit: it carries the mood the mockup has
without presenting itself as something to copy. The app shows no arrows
against a body until reviewed cues exist for that movement — the callouts
are gated on `technique`, which only a named reviewer fills.

If you want a true annotated demo, that is the reviewer's deliverable:
they approve the picture and the cues together, and then the same slot
renders the arrows.

## House style (keep identical across all of them)

```
matte near-black background, single hard key light from upper left, deep
shadow falloff, fine film grain, desaturated, photographic, 85mm look,
4:3 landscape, no text, no labels, no watermark, no logos
```

Export **webp**, ~1600×1200, quality 80, under 200 KB.

## Set A — equipment and room (safe to ship as-is, eight files)

| Save as | Prompt |
| --- | --- |
| `pattern-squat.webp` | Loaded barbell resting in a squat rack in an empty matte black gym, visible steel knurling and chalk dust, matte near-black background, single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, photographic, 85mm look, 4:3 landscape, no text, no labels, no watermark, no logos |
| `pattern-hinge.webp` | Loaded barbell lying on a rubber gym floor ready to be lifted, chalk dust in the air, matte near-black background, single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, photographic, 85mm look, 4:3 landscape, no text, no labels, no watermark, no logos |
| `pattern-single-leg.webp` | One dumbbell on a rubber floor beside a low wooden plyo box, empty gym, matte near-black background, single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, photographic, 85mm look, 4:3 landscape, no text, no labels, no watermark, no logos |
| `pattern-horizontal-push.webp` | Empty flat bench under a racked barbell, bare matte black gym, matte near-black background, single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, photographic, 85mm look, 4:3 landscape, no text, no labels, no watermark, no logos |
| `pattern-vertical-push.webp` | Two heavy dumbbells standing on end on a rubber floor, long shadows, matte near-black background, single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, photographic, 85mm look, 4:3 landscape, no text, no labels, no watermark, no logos |
| `pattern-horizontal-pull.webp` | Cable row station with the handle hanging still, empty matte black gym, matte near-black background, single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, photographic, 85mm look, 4:3 landscape, no text, no labels, no watermark, no logos |
| `pattern-vertical-pull.webp` | Steel pull-up bar bolted to a concrete wall, empty, chalk marks on the bar, matte near-black background, single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, photographic, 85mm look, 4:3 landscape, no text, no labels, no watermark, no logos |
| `pattern-core.webp` | Rolled exercise mat and a single kettlebell on a rubber floor, matte near-black background, single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, photographic, 85mm look, 4:3 landscape, no text, no labels, no watermark, no logos |

## Set B — figure in shadow (the mockup's mood; no arrows until reviewed)

Silhouette and rim light on purpose: the shape reads, the joint angles
don't, so the picture can't be mistaken for a form reference.

| Save as | Prompt |
| --- | --- |
| `figure-squat.webp` | Rim-lit silhouette of a single athlete holding a barbell across the shoulders, seen from behind in near darkness, only the outline visible, backlit haze, matte near-black background, single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, photographic, 85mm look, 4:3 landscape, no text, no labels, no watermark, no logos |
| `figure-hinge.webp` | Rim-lit silhouette of a single athlete standing over a barbell, side view in near darkness, outline only, backlit haze, matte near-black background, single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, photographic, 85mm look, 4:3 landscape, no text, no labels, no watermark, no logos |
| `figure-single-leg.webp` | Rim-lit silhouette of a single athlete stepping onto a low box holding a dumbbell, side view in near darkness, outline only, matte near-black background, single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, photographic, 85mm look, 4:3 landscape, no text, no labels, no watermark, no logos |
| `figure-horizontal-push.webp` | Rim-lit silhouette of a single athlete lying on a flat bench in near darkness, seen from the side, outline only, backlit haze, matte near-black background, single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, photographic, 85mm look, 4:3 landscape, no text, no labels, no watermark, no logos |
| `figure-vertical-push.webp` | Rim-lit silhouette of a single athlete holding dumbbells at the shoulders, seen from behind in near darkness, outline only, matte near-black background, single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, photographic, 85mm look, 4:3 landscape, no text, no labels, no watermark, no logos |
| `figure-horizontal-pull.webp` | Rim-lit silhouette of a single athlete seated at a cable row station in near darkness, side view, outline only, matte near-black background, single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, photographic, 85mm look, 4:3 landscape, no text, no labels, no watermark, no logos |
| `figure-vertical-pull.webp` | Rim-lit silhouette of a single athlete hanging from a pull-up bar, seen from behind in near darkness, outline only, backlit haze, matte near-black background, single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, photographic, 85mm look, 4:3 landscape, no text, no labels, no watermark, no logos |
| `figure-core.webp` | Rim-lit silhouette of a single athlete on a mat in a plank, side view in near darkness, outline only, matte near-black background, single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, photographic, 85mm look, 4:3 landscape, no text, no labels, no watermark, no logos |

Per-movement art is optional and only worth it for the few people open
most. Same rules, named `<movement-id>.webp` — ids are in
`lib/movements/library.ts`.

## Where they go

1. Save into `public/movements/`.
2. Add the path to `PATTERN_IMAGES` (or `MOVEMENT_IMAGES`) in
   `lib/movements/images.ts`.
3. `npx vitest run lib/__tests__/movements.test.ts` — it fails if a path in
   there isn't on disk, so a typo can't ship as a broken image.

Anything not listed keeps the pattern mark. Partial art is fine: half the
patterns done reads as intentional, not unfinished.

## When the reviewer lands

Their deliverable per movement, in `technique`:

- `steps` — the numbered list.
- `cues` — three or four short ones.
- `mistakes` — what goes wrong, named without blame.
- `callouts` — the same cues pinned to the hero with `x`/`y` percentages,
  which is what draws the mockup's arrows.
- `reviewedBy` and `reviewedOn` — a person's name and a date, shown on the
  screen. Not "Voxu", not a company.

Until that object exists the screen says Voxu doesn't teach technique and
points at a coach or physio. That line is load-bearing, not a placeholder.

## The other kinds of training

Same house style, 16:9 rather than 4:3 — these sit as a header strip, not a
hero. Objects and rooms, no people: a picture of somebody else studying is
a picture of somebody else's life, and that screen belongs to the person
holding the phone.

Save into `public/practices/`, then add the path to `DOMAIN_IMAGES` in
`lib/practices/domain-art.ts`.

| Save as | Prompt |
| --- | --- |
| `run.webp` | Empty asphalt road at first light disappearing into mist, wet surface, no cars, no people, matte near-black background, single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, photographic, 85mm look, 16:9, no text, no labels, no watermark, no logos |
| `read.webp` | Worn hardback book lying open on a dark wooden table under a single lamp, dust in the beam, no hands, no people, matte near-black background, single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, photographic, 85mm look, 16:9, no text, no labels, no watermark, no logos |
| `study.webp` | Bare desk in a dark room with an open notebook, a pen and a lamp, one chair pushed back, no people, matte near-black background, single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, photographic, 85mm look, 16:9, no text, no labels, no watermark, no logos |
| `work.webp` | Closed laptop and a cold cup of coffee on a dark desk, low light, no people, matte near-black background, single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, photographic, 85mm look, 16:9, no text, no labels, no watermark, no logos |
| `mind.webp` | Single low cushion on a bare wooden floor beside a window at dawn, empty room, no people, matte near-black background, single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, photographic, 85mm look, 16:9, no text, no labels, no watermark, no logos |

Add to any of these prompts if a generator returns a contact sheet:
`single subject filling the frame, one photograph, not a collage, not a grid`.

## Per-movement art — the fourteen that matter

These are the movements a template can actually put in front of someone
(`npx tsx scripts/movement-art-todo.ts` regenerates the list). They show on
the variation cards and as the hero for that specific movement.

Same tail on every one:

```
side view in near darkness, outline only, backlit haze, matte near-black background, single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, photographic, 85mm look, 4:3 landscape, single subject filling the frame, one photograph, not a collage, no text, no labels, no watermark, no logos
```

| Save as | Subject (prepend to the tail) |
| --- | --- |
| `bodyweight-squat.webp` | Rim-lit silhouette of a single athlete standing with arms held forward at chest height on a bare gym floor, |
| `dumbbell-rdl.webp` | Rim-lit silhouette of a single athlete standing holding two dumbbells at thigh height, |
| `back-extension.webp` | Rim-lit silhouette of a single athlete face down on a back-extension bench in an empty gym, |
| `glute-bridge.webp` | Rim-lit silhouette of a single athlete lying on a mat with the hips lifted, |
| `reverse-lunge.webp` | Rim-lit silhouette of a single athlete in a long split stance holding two dumbbells, |
| `floor-press.webp` | Rim-lit silhouette of a single athlete lying on a gym floor holding two dumbbells above the chest, |
| `push-up.webp` | Rim-lit silhouette of a single athlete at the top of a push-up on a bare gym floor, |
| `dip.webp` | Rim-lit silhouette of a single athlete supported on parallel bars, |
| `band-row.webp` | Rim-lit silhouette of a single athlete standing holding a resistance band anchored ahead of them, |
| `inverted-row.webp` | Rim-lit silhouette of a single athlete hanging beneath a waist-high bar in a rack, |
| `band-pulldown.webp` | Rim-lit silhouette of a single athlete kneeling holding a band anchored overhead, |
| `chin-up.webp` | Rim-lit silhouette of a single athlete hanging from a steel bar, seen from behind, |
| `dumbbell-shoulder-press.webp` | Rim-lit silhouette of a single athlete seated holding two dumbbells at shoulder height, |
| `machine-shoulder-press.webp` | Rim-lit silhouette of a single athlete seated at a shoulder press machine in an empty gym, |
| `pike-push-up.webp` | Rim-lit silhouette of a single athlete with hands and feet on the floor and the hips high, |
| `dead-bug.webp` | Rim-lit silhouette of a single athlete lying on their back on a mat with one arm and one leg raised, |

## Still missing from the gym set

| Save as | Prompt |
| --- | --- |
| `figure-hinge.webp` | Rim-lit silhouette of a single athlete standing over a loaded barbell, side view in near darkness, outline only, backlit haze, matte near-black background, single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, photographic, 85mm look, 4:3 landscape, single subject filling the frame, one photograph, not a collage, no text, no labels, no watermark, no logos |
| `kit-vertical-push.webp` | Two heavy dumbbells standing on end on a rubber floor, long shadows, empty gym, matte near-black background, single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, photographic, 85mm look, 4:3 landscape, single subject filling the frame, one photograph, not a collage, no text, no labels, no watermark, no logos |
