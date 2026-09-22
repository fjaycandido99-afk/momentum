import 'dotenv/config'

import { createChatCompletion } from '../lib/groq'
import { MOVEMENTS, PATTERN_LABELS } from '../lib/movements/library'
import { DRAFT_SYSTEM_PROMPT, draftUserPrompt, parseDraft } from '../lib/movements/technique-draft'
import { saveDraft, techniqueRowIds } from '../lib/movements/technique-server'

/**
 * Draft technique notes for every movement that has none.
 *
 * Writes UNPUBLISHED rows only. Nothing this script produces is visible to
 * anyone until a person opens /admin/movements, reads it, and puts their
 * name on it — saveDraft cannot publish, and it refuses to touch a
 * movement somebody already signed.
 *
 *   npx tsx scripts/draft-technique.ts --limit 10
 *   npx tsx scripts/draft-technique.ts --pattern squat
 *   npx tsx scripts/draft-technique.ts --dry
 *
 * --dry prints the first draft and writes nothing, which is how you check
 * the prompt before spending anything on seventy-nine calls.
 */

const args = process.argv.slice(2)
const flag = (name: string) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const limit = Number(flag('--limit') ?? Infinity)
const pattern = flag('--pattern')
const dry = args.includes('--dry')

async function main() {
  const existing = await techniqueRowIds()
  const taken = new Set([...existing.published, ...existing.drafts])

  const todo = MOVEMENTS
    .filter(m => !taken.has(m.id))
    .filter(m => !pattern || m.pattern === pattern)
    .slice(0, dry ? 1 : limit)

  console.log(
    `\n${existing.published.length} published, ${existing.drafts.length} drafted, ` +
      `${MOVEMENTS.length} in the library.`,
  )
  console.log(`Drafting ${todo.length}${dry ? ' (dry run — nothing will be written)' : ''}.\n`)

  const today = new Date().toISOString().slice(0, 10)
  let kept = 0
  let rejected = 0

  for (const movement of todo) {
    const user = draftUserPrompt(movement.id)
    if (!user) continue

    process.stdout.write(`  ${movement.name.padEnd(28)} ${PATTERN_LABELS[movement.pattern].padEnd(18)}`)

    let text = ''
    try {
      const completion = await createChatCompletion(
        {
          messages: [
            { role: 'system', content: DRAFT_SYSTEM_PROMPT },
            { role: 'user', content: user },
          ],
          temperature: 0.4,
          max_tokens: 900,
        },
        { endpoint: 'movement-technique-draft-script' },
      )
      text = completion.choices?.[0]?.message?.content ?? ''
    } catch (error) {
      console.log(`model failed — ${(error as Error).message}`)
      continue
    }

    const result = parseDraft(movement.id, text, today)
    if (!result) {
      console.log('unknown movement')
      continue
    }

    if (result.rejected) {
      rejected += 1
      console.log(result.rejected)
      continue
    }

    if (dry) {
      console.log('ok — dry run\n')
      console.log(JSON.stringify(result.draft, null, 2))
      break
    }

    await saveDraft(movement.id, result.draft)
    kept += 1
    console.log(`drafted (${result.draft.steps.length} steps, ${result.draft.callouts?.length ?? 0} callouts)`)
  }

  if (!dry) {
    console.log(`\n${kept} drafted, ${rejected} rejected. None of it is visible to anyone.`)
    console.log('Read and sign them at /admin/movements — Publish is the only thing that shows them.\n')
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
