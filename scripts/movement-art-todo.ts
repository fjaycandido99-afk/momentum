import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { MOVEMENTS_BY_ID, PATTERN_LABELS, type MovementPattern } from '../lib/movements/library'
import { MOVEMENT_IMAGES, PATTERN_IMAGES } from '../lib/movements/images'
import { KIT_LABELS, TEMPLATES, movementFor, type Kit } from '../lib/movements/templates'

/**
 * Which art is actually worth generating.
 *
 * The library has forty movements, but a template can only ever produce
 * the handful its patterns resolve to — so the art that appears on screen
 * for most people is a short list, not forty. This prints that list, and
 * whether the file exists yet.
 *
 *   npx tsx scripts/movement-art-todo.ts
 */

const KITS: Kit[] = ['gym', 'home', 'bodyweight']

const used = new Map<string, Set<string>>()

for (const template of TEMPLATES) {
  for (const day of template.days) {
    for (const pattern of day.patterns) {
      for (const kit of KITS) {
        const movement = movementFor(pattern, kit)
        if (!movement) continue
        if (!used.has(movement.id)) used.set(movement.id, new Set())
        used.get(movement.id)!.add(`${template.name} · ${KIT_LABELS[kit]}`)
      }
    }
  }
}

const onDisk = (path: string) => existsSync(join(process.cwd(), 'public', path))

console.log('\nMovements a template can put in front of someone\n')
const rows = [...used.entries()]
  .map(([id, where]) => ({ movement: MOVEMENTS_BY_ID.get(id)!, where: [...where] }))
  .sort((a, b) => a.movement.pattern.localeCompare(b.movement.pattern))

for (const row of rows) {
  const own = MOVEMENT_IMAGES[row.movement.id]
  const family = PATTERN_IMAGES[row.movement.pattern]
  const state = own && onDisk(own)
    ? 'has its own art'
    : family && onDisk(family)
      ? `uses ${PATTERN_LABELS[row.movement.pattern]} art`
      : 'NO ART — draws the pattern mark'
  console.log(`  ${row.movement.name.padEnd(26)} ${PATTERN_LABELS[row.movement.pattern].padEnd(18)} ${state}`)
  console.log(`  ${''.padEnd(26)} used by: ${row.where.join(', ')}`)
}

console.log(`\n${rows.length} movements, out of ${MOVEMENTS_BY_ID.size} in the library.`)

const patterns = [...new Set(rows.map(r => r.movement.pattern))] as MovementPattern[]
const missingPatterns = patterns.filter(p => {
  const path = PATTERN_IMAGES[p]
  return !path || !onDisk(path)
})

if (missingPatterns.length === 0) {
  console.log('Every pattern a template uses has art. Nothing to generate.\n')
} else {
  console.log(`\nPattern art still to generate (${missingPatterns.length}):`)
  for (const pattern of missingPatterns) {
    console.log(`  pattern-${pattern.replace(/_/g, '-')}.webp   — ${PATTERN_LABELS[pattern]}`)
  }
  console.log('\nPrompts: docs/movements/image-brief.md\n')
}
