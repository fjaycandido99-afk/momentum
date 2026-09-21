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
