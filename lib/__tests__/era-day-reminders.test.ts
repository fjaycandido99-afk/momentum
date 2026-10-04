import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// Settings › Notifications › "Your era's day": the four reminders follow the
// era (promise → check → did you keep it → set tomorrow), each behind ONLY
// its own switch and time.
const src = readFileSync(join(process.cwd(), 'lib/push-service.ts'), 'utf8')

describe("your era's day reminders", () => {
  it('the check-in runs at their Evening time behind its switch, not a fixed 8pm', () => {
    const fn = src.slice(src.indexOf('export async function sendEraCheckins'), src.indexOf('export async function sendEraCompletions'))
    expect(fn).toMatch(/winddown_reminder_enabled: true/)
    expect(fn).toMatch(/winddown_reminder_time/)
    expect(fn).not.toMatch(/filterUsersByLocalHour\([^)]*, 20\)/)
  })

  it('every one of the four (and the check-in) obeys only its own switch', () => {
    expect(src).toMatch(/OWN_SWITCH_TYPES[^\n]*'era_checkin'/)
    const seg = src.slice(src.indexOf('async function sendSegmentReminder'), src.indexOf('export async function sendMiddayResets'))
    expect(seg).not.toMatch(/checkpoint_alerts: true/)
  })

  it('midday asks about the promise; wind-down defers to the check-in; bedtime asks for tomorrow', () => {
    const seg = src.slice(src.indexOf('async function sendSegmentReminder'), src.indexOf('export async function sendMiddayResets'))
    expect(seg).toMatch(/How's "\$\{promise\}" going\?/)
    expect(seg).toMatch(/if \(era\.today && era\.today\.kept === null\) continue/)
    expect(src).toMatch(/Set tomorrow's promise before you sleep/)
  })
})
