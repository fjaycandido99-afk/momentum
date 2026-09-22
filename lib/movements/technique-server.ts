import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { MovementTechnique } from './library'
import { toTechnique, type TechniqueDraft } from './technique'

/**
 * Reading and writing reviewed technique.
 *
 * Thin on purpose: every rule lives in ./technique.ts, which is pure and
 * tested. This file moves rows.
 */

function fromRow(row: {
  reviewed_by: string
  reviewed_on: string
  steps: Prisma.JsonValue
  cues: Prisma.JsonValue | null
  mistakes: Prisma.JsonValue | null
  callouts: Prisma.JsonValue | null
}): MovementTechnique {
  // Stored as Json, so nothing here is trusted to be the right shape — a
  // row written by an older version of the editor must not crash a screen.
  const array = (value: Prisma.JsonValue | null): unknown[] =>
    Array.isArray(value) ? value : []

  return {
    reviewedBy: row.reviewed_by,
    reviewedOn: row.reviewed_on,
    steps: array(row.steps).filter((s): s is string => typeof s === 'string'),
    cues: array(row.cues) as MovementTechnique['cues'],
    mistakes: array(row.mistakes) as MovementTechnique['mistakes'],
    callouts: array(row.callouts) as MovementTechnique['callouts'],
  }
}

/**
 * Every movement with PUBLISHED guidance, keyed by movement id.
 *
 * The published filter is the whole guarantee. A draft is a row in this
 * table, so if this query ever stops filtering, unsigned text appears on
 * a paying customer screen — which is why the filter lives here, in the
 * one function every reader path goes through, and is asserted in a test.
 */
export async function allTechnique(): Promise<Record<string, MovementTechnique>> {
  const rows = await prisma.movementTechnique.findMany({ where: { published: true } })
  const out: Record<string, MovementTechnique> = {}
  for (const row of rows) out[row.movement_id] = fromRow(row)
  return out
}

/** Published guidance for one movement. */
export async function techniqueFor(movementId: string): Promise<MovementTechnique | null> {
  const row = await prisma.movementTechnique.findFirst({
    where: { movement_id: movementId, published: true },
  })
  return row ? fromRow(row) : null
}

/**
 * Everything in the table including drafts — for the editor only.
 *
 * Separate function rather than a flag on the one above, so a reader path
 * cannot reach a draft by passing the wrong argument.
 */
export async function allTechniqueForEditor(): Promise<
  Record<string, MovementTechnique & { published: boolean }>
> {
  const rows = await prisma.movementTechnique.findMany()
  const out: Record<string, MovementTechnique & { published: boolean }> = {}
  for (const row of rows) out[row.movement_id] = { ...fromRow(row), published: row.published }
  return out
}

/**
 * Write guidance.
 *
 * Publishing is explicit at every call site, with no default — a default
 * would eventually publish something nobody meant to.
 */
export async function saveTechnique(
  draft: TechniqueDraft,
  published: boolean,
): Promise<MovementTechnique> {
  const technique = toTechnique(draft)
  const data = {
    published,
    reviewed_by: technique.reviewedBy,
    reviewed_on: technique.reviewedOn,
    steps: technique.steps as unknown as Prisma.InputJsonValue,
    cues: (technique.cues ?? []) as unknown as Prisma.InputJsonValue,
    mistakes: (technique.mistakes ?? []) as unknown as Prisma.InputJsonValue,
    callouts: (technique.callouts ?? []) as unknown as Prisma.InputJsonValue,
  }

  await prisma.movementTechnique.upsert({
    where: { movement_id: draft.movementId },
    create: { movement_id: draft.movementId, ...data },
    update: data,
  })

  return technique
}

/**
 * Remove guidance for a movement.
 *
 * Withdrawing has to be as easy as publishing: if a reviewer changes their
 * mind, or leaves, the cues should come off the screen the same day.
 */
export async function deleteTechnique(movementId: string): Promise<void> {
  await prisma.movementTechnique.deleteMany({ where: { movement_id: movementId } })
}
