/**
 * The next real milestone, for the coach — pure. Only things the record
 * actually counts toward, and only when close (within MILESTONE_WINDOW
 * days): the era's last day, the end of a chapter, or a kept run reaching
 * 5 / 10 / 15 / 20 / 30. The nearest one wins; nothing close → null.
 */
export const MILESTONE_WINDOW = 3
const RUN_STEPS = [5, 10, 15, 20, 30]

export interface MilestoneInput {
  day: number
  lengthDays: number
  /** 1–4, the chapter, its label, and where they are inside it. */
  phaseIndex: number
  phaseLabel: string
  dayInPhase: number
  phaseDays: number
  /** Kept promises in a row, up to the last answered day. */
  keptRun: number
}

const when = (n: number) => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`)

export function nextMilestone(m: MilestoneInput): string | null {
  const options: { distance: number; line: string }[] = []

  const toEnd = m.lengthDays - m.day
  if (toEnd >= 0 && toEnd <= MILESTONE_WINDOW) {
    options.push({ distance: toEnd, line: `Day ${m.lengthDays}, the last day of this era, is ${when(toEnd)}.` })
  }

  const toChapterEnd = m.phaseDays - m.dayInPhase
  if (m.phaseIndex < 4 && toChapterEnd >= 0 && toChapterEnd <= MILESTONE_WINDOW && toChapterEnd < toEnd) {
    options.push({
      distance: toChapterEnd,
      line: `Chapter ${m.phaseIndex} (${m.phaseLabel}) ends ${when(toChapterEnd)}; chapter ${m.phaseIndex + 1} starts on day ${m.day + toChapterEnd + 1}.`,
    })
  }

  const step = RUN_STEPS.find(s => s > m.keptRun)
  if (m.keptRun > 0 && step && step - m.keptRun <= MILESTONE_WINDOW) {
    const more = step - m.keptRun
    options.push({ distance: more, line: `They've kept ${m.keptRun} promises in a row; ${step} would take ${more} more.` })
  }

  if (!options.length) return null
  return options.sort((a, b) => a.distance - b.distance)[0].line
}
