import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { MOVEMENTS, PATTERN_LABELS, type Movement, type MovementPattern } from '../lib/movements/library'
import { KIT_IMAGES, MOVEMENT_IMAGES, REGION_IMAGES } from '../lib/movements/images'
import { REGION_LABELS, type Region } from '../lib/movements/library'

/**
 * Prompts for the art that is still missing, printed ready to paste.
 *
 * Written as a generator rather than a document because the library grows:
 * seventy-nine movements is more than anyone wants to keep in a table by
 * hand, and a list that drifts out of date is worse than no list.
 *
 *   npx tsx scripts/movement-art-prompts.ts            # everything missing
 *   npx tsx scripts/movement-art-prompts.ts squat      # one pattern
 *   npx tsx scripts/movement-art-prompts.ts --kit      # the browser's kit shots
 *   npx tsx scripts/movement-art-prompts.ts --regions  # the body panel
 *   npx tsx scripts/movement-art-prompts.ts --limit 8  # a batch at a time
 */

const TAIL =
  'side view in near darkness, outline only, backlit haze, matte near-black background, ' +
  'single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, ' +
  'photographic, 85mm look, 4:3 landscape, single subject filling the frame, one photograph, ' +
  'not a collage, no text, no labels, no watermark, no logos'

/**
 * Subjects where the movement's name alone would send an image model
 * somewhere useless. Everything else takes the generic line, which is
 * fine for a silhouette — and every result gets looked at before it ships.
 */
const SUBJECTS: Record<string, string> = {
  pallof_press: 'a single athlete standing side-on holding a cable handle at the chest',
  ab_wheel: 'a single athlete kneeling on a mat with both hands on a small wheel',
  farmers_carry: 'a single athlete walking while holding a heavy dumbbell in each hand',
  suitcase_carry: 'a single athlete walking while holding one heavy dumbbell at one side',
  front_rack_carry: 'a single athlete standing holding two kettlebells against the chest',
  nordic_curl: 'a single athlete kneeling on a mat with the ankles held down, leaning forward',
  slider_leg_curl: 'a single athlete lying on their back on a mat with the heels on small sliders',
  reverse_nordic: 'a single athlete kneeling upright on a mat leaning back from the knees',
  sissy_squat: 'a single athlete kneeling back on the toes with the torso leaning away',
  dead_bug: 'a single athlete lying on their back on a mat with one arm and one leg raised',
  hanging_knee_raise: 'a single athlete hanging from a bar with the knees drawn up',
  cable_crunch: 'a single athlete kneeling at a cable stack holding a rope behind the head',
  landmine_press: 'a single athlete standing holding the end of a barbell angled from the floor',
  pallof: 'a single athlete standing side-on to a cable stack',
}

const idToFile = (id: string) => `${id.replace(/_/g, '-')}.webp`
const onDisk = (p: string) => existsSync(join(process.cwd(), 'public', p))

function promptFor(movement: Movement): string {
  const subject = SUBJECTS[movement.id] ?? `a single athlete performing a ${movement.name.toLowerCase()}`
  return `Rim-lit silhouette of ${subject}, ${TAIL}`
}

const args = process.argv.slice(2)
const limitArg = args.indexOf('--limit')
const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity
const patternArg = args.find(a => !a.startsWith('--') && a !== String(limit))

if (args.includes('--kit')) {
  // The browser shows one kit shot per pattern. These are objects, not
  // people, so they can ship without review.
  const KIT_SUBJECTS: Partial<Record<MovementPattern, string>> = {
    vertical_push: 'Two heavy dumbbells standing on end on a rubber floor, long shadows, empty gym',
    carry: 'Two heavy dumbbells set down side by side on a rubber floor, empty gym',
    lateral_raise: 'A pair of light dumbbells on a rubber floor beside a mirror, empty gym',
    elbow_flexion: 'A loaded curl bar resting on a rack in an empty matte black gym',
    elbow_extension: 'A cable stack with a rope attachment hanging still, empty gym',
    knee_extension: 'An empty leg extension machine in a dark gym',
    knee_flexion: 'An empty seated leg curl machine in a dark gym',
    calf: 'An empty calf raise platform in a dark gym',
  }
  const missing = (Object.keys(KIT_SUBJECTS) as MovementPattern[]).filter(p => {
    const path = KIT_IMAGES[p]
    return !path || !onDisk(path)
  })
  console.log(`\nKit shots still missing (${missing.length}) — for the library browser\n`)
  for (const pattern of missing) {
    console.log(`kit-${pattern.replace(/_/g, '-')}.webp   — ${PATTERN_LABELS[pattern]}`)
    console.log(`${KIT_SUBJECTS[pattern]}, matte near-black background, single hard key light from upper left, deep shadow falloff, fine film grain, desaturated, photographic, 85mm look, 4:3 landscape, single subject filling the frame, one photograph, not a collage, no text, no labels, no watermark, no logos\n`)
  }
} else if (args.includes('--regions')) {
  // The body panel. A location, lit the same for every region — see
  // lib/movements/images.ts on why there is no heat map.
  const POSTERIOR: Region[] = ['back', 'glutes', 'hamstrings', 'triceps']
  const regions = (Object.keys(REGION_LABELS) as Region[]).filter(r => {
    const path = REGION_IMAGES[r]
    return !path || !onDisk(path)
  })
  console.log(`\nBody panel still missing (${regions.length})\n`)
  for (const region of regions) {
    const view = POSTERIOR.includes(region) ? 'from behind' : 'from the front'
    console.log(`region-${region}.webp   — ${REGION_LABELS[region]}`)
    console.log(`Anatomical silhouette of a single human figure standing ${view} in near darkness, the ${REGION_LABELS[region].toLowerCase()} glowing pale white, the rest of the body in deep shadow, matte near-black background, even soft rim light, fine film grain, desaturated, 3:4 portrait, single figure centred, one image, not a collage, no text, no labels, no watermark, no logos\n`)
  }
} else {
  const missing = MOVEMENTS
    .filter(m => !MOVEMENT_IMAGES[m.id] || !onDisk(MOVEMENT_IMAGES[m.id]))
    .filter(m => !patternArg || m.pattern === patternArg)

  console.log(`\n${missing.length} movements without their own art${patternArg ? ` in ${patternArg}` : ''}.`)
  console.log('Everything below falls back to its family art until the file exists.\n')

  for (const movement of missing.slice(0, limit)) {
    console.log(`${idToFile(movement.id)}   — ${movement.name} (${PATTERN_LABELS[movement.pattern]})`)
    console.log(`${promptFor(movement)}\n`)
  }

  if (missing.length > limit) {
    console.log(`… ${missing.length - limit} more. Re-run with --limit ${limit} after these land.`)
  }
}
