import type { PatternKind } from '@/lib/patterns/rules'
import type { ExperimentDef } from '@/lib/patterns/experiments'

/**
 * The Psychology Library — short lessons on the ideas Voxu is built on.
 *
 * Rules every card follows (pinned by lib/__tests__/psychology-lessons):
 * - Each one rests on a named, published source, and says only what that
 *   source found. No invented numbers; when unsure of a figure, no figure.
 * - Ideas about how PEOPLE work, never a label for the reader. Nothing
 *   clinical, nothing diagnostic, no "you are a …".
 * - A finding is a finding, not a promise: "people who … tended to …".
 * - The loops are general patterns many people fall into — never built from
 *   anyone's journal (the privacy policy forbids reading it).
 *
 * Pure data.
 */

export type LessonGroup = 'starting' | 'keeping' | 'miss' | 'mind'

export const LESSON_GROUPS: { key: LessonGroup; title: string; sub: string }[] = [
  { key: 'starting', title: 'Starting', sub: 'How a promise gets made well' },
  { key: 'keeping', title: 'Keeping going', sub: 'What carries a habit through the middle' },
  { key: 'miss', title: 'After a miss', sub: 'Why the second day matters more than the first' },
  { key: 'mind', title: 'In your head', sub: 'Working with thoughts, not against them' },
]

export interface Source {
  /** Authors, year, title, where — enough to find it. */
  cite: string
  /** What it actually found, in plain words. */
  finding: string
}

export interface Loop {
  trigger: string
  thought: string
  behavior: string
  outcome: string
  /** The changed step that breaks it. */
  newLoop: string
}

export interface Lesson {
  id: string
  group: LessonGroup
  title: string
  /** One sentence — the whole idea. */
  line: string
  /** Two or three short paragraphs. */
  body: string[]
  loop?: Loop
  tryThis: { text: string; href?: string; cta?: string }
  sources: Source[]
}

export const LESSONS: Lesson[] = [
  // ── Starting ────────────────────────────────────────────────────────────
  {
    id: 'if-then-plans',
    group: 'starting',
    title: 'If-then plans',
    line: 'Deciding when and where in advance makes it far more likely you act.',
    body: [
      'An intention says what you want to do. An "if-then plan" adds the moment: "If it\'s 7 AM and I\'ve poured coffee, then I open the document."',
      'Across many studies, people who made plans like this reached their goals more often than people who only set the goal. The plan hands the decision to the situation, so you aren\'t deciding again when the moment comes.',
    ],
    tryThis: {
      text: 'Write today\'s promise with a when and a where in it — "after lunch, at my desk".',
      href: '/',
      cta: 'Make today\'s promise',
    },
    sources: [
      {
        cite: 'Gollwitzer, P. M. (1999). Implementation intentions: Strong effects of simple plans. American Psychologist, 54(7), 493–503.',
        finding: 'Introduced if-then planning and reviewed early evidence that it helps people act on their intentions.',
      },
      {
        cite: 'Gollwitzer, P. M., & Sheeran, P. (2006). Implementation intentions and goal achievement: A meta-analysis of effects and processes. Advances in Experimental Social Psychology, 38, 69–119.',
        finding: 'Pooled 94 independent tests and found a medium-to-large effect of if-then plans on reaching goals.',
      },
    ],
  },
  {
    id: 'specific-goals',
    group: 'starting',
    title: 'Specific beats "do your best"',
    line: 'A clear target gets more done than a general intention to try hard.',
    body: [
      '"Work on the project" leaves every decision for later: which part, how much, when is it done. "Write the first 200 words" answers all three.',
      'Decades of goal-setting research found that specific goals led to better performance than being told to "do your best" — partly because a specific goal tells you when you\'ve finished.',
    ],
    tryThis: {
      text: 'Check today\'s promise: could someone else tell, tonight, whether you kept it? If not, make it that clear.',
      href: '/',
      cta: 'Make today\'s promise',
    },
    sources: [
      {
        cite: 'Locke, E. A., & Latham, G. P. (2002). Building a practically useful theory of goal setting and task motivation: A 35-year odyssey. American Psychologist, 57(9), 705–717.',
        finding: 'Summarised research showing specific, challenging goals led to higher performance than vague "do your best" goals.',
      },
    ],
  },
  {
    id: 'planning-fallacy',
    group: 'starting',
    title: 'The planning fallacy',
    line: 'People reliably underestimate how long their own tasks will take.',
    body: [
      'When students in one study were asked when they would finish their thesis, most finished later than they predicted — on average later even than their own "if everything goes wrong" guess.',
      'We plan from the best-case story of the task and forget the interruptions that always come. That is why a promise sized for a perfect day so often fails on a normal one.',
    ],
    loop: {
      trigger: 'You feel behind.',
      thought: '"I need to catch up on everything today."',
      behavior: 'You make an oversized promise.',
      outcome: 'It looks too big to start, so you put it off.',
      newLoop: 'Promise one thing you could finish in 20 minutes.',
    },
    tryThis: {
      text: 'Run the "keep it small" experiment for a week and see what your own record says.',
      href: '/patterns',
      cta: 'See experiments',
    },
    sources: [
      {
        cite: 'Buehler, R., Griffin, D., & Ross, M. (1994). Exploring the "planning fallacy": Why people underestimate their task completion times. Journal of Personality and Social Psychology, 67(3), 366–381.',
        finding: 'Students finished their theses later than predicted, on average later than their own worst-case estimates.',
      },
    ],
  },
  {
    id: 'mental-contrasting',
    group: 'starting',
    title: 'Picture the obstacle too',
    line: 'Imagining the goal and then the thing most likely to stop you works better than imagining the goal alone.',
    body: [
      'This method is called mental contrasting, and its practical form is known as WOOP: Wish, Outcome, Obstacle, Plan. You picture what you want, then the most likely thing in the way, then plan for that obstacle with an if-then.',
      'In one study, students who learned this completed more practice questions for an exam than students who did a control exercise.',
    ],
    tryThis: {
      text: 'Before you promise, name the one thing most likely to get in the way, and add "if that happens, I will …".',
    },
    sources: [
      {
        cite: 'Duckworth, A. L., Grant, H., Loew, B., Oettingen, G., & Gollwitzer, P. M. (2011). Self-regulation strategies improve self-discipline in adolescents: Benefits of mental contrasting and implementation intentions. Educational Psychology, 31(1), 17–26.',
        finding: 'Students taught mental contrasting with if-then plans completed more practice questions than a control group.',
      },
    ],
  },
  {
    id: 'fresh-start',
    group: 'starting',
    title: 'The fresh start effect',
    line: 'New beginnings — a Monday, a month, a birthday — make people more likely to start.',
    body: [
      'Researchers found more searches for "diet", more gym visits and more goal commitments just after landmarks in time like the start of a week, a month or a year.',
      'A landmark seems to draw a line between an old self and a new one, so past slips feel like they belong to "before". An era is a landmark you choose for yourself.',
    ],
    tryThis: {
      text: 'If the last stretch went badly, you don\'t have to wait for Monday — starting a new era is a landmark too.',
      href: '/era',
      cta: 'Your era',
    },
    sources: [
      {
        cite: 'Dai, H., Milkman, K. L., & Riis, J. (2014). The fresh start effect: Temporal landmarks motivate aspirational behavior. Management Science, 60(10), 2563–2582.',
        finding: 'Searches for "diet", gym visits and goal commitments rose after temporal landmarks such as new weeks, months and years.',
      },
    ],
  },

  // ── Keeping going ───────────────────────────────────────────────────────
  {
    id: 'habits-take-time',
    group: 'keeping',
    title: 'Habits take longer than 21 days',
    line: 'Daily actions became automatic after about two months on average — with huge differences between people.',
    body: [
      'In a study that followed people building a new daily habit, it took a median of 66 days for the habit to reach its peak automaticity. Some got there in under three weeks; for others the estimate ran to most of a year.',
      'The same study found that missing a single day did not meaningfully set people back. Steady repetition in the same situation mattered more than a perfect record.',
    ],
    tryThis: {
      text: 'Read your era as one stretch of a longer road, not a test you pass or fail in 30 days.',
      href: '/proof',
      cta: 'See your Proof',
    },
    sources: [
      {
        cite: 'Lally, P., van Jaarsveld, C. H. M., Potts, H. W. W., & Wardle, J. (2010). How are habits formed: Modelling habit formation in the real world. European Journal of Social Psychology, 40(6), 998–1009.',
        finding: 'The median time to reach peak automaticity was 66 days (range 18–254); missing one opportunity did not materially affect habit formation.',
      },
    ],
  },
  {
    id: 'cues-and-friction',
    group: 'keeping',
    title: 'Cues and friction',
    line: 'Habits run on the situation around you more than on willpower.',
    body: [
      'Much of what we repeat is set off by cues: a place, a time of day, the thing we just did. Once a habit forms, the cue can start it with little thought.',
      'That\'s why the situation is the easiest thing to change. Put the book on the pillow, the shoes by the door, the phone in another room. Making the good action a little easier and the other one a little harder adds up.',
    ],
    tryThis: {
      text: 'Tie your promise to something you already do every day: "after I brush my teeth, I …".',
    },
    sources: [
      {
        cite: 'Wood, W., & Neal, D. T. (2007). A new look at habits and the habit–goal interface. Psychological Review, 114(4), 843–863.',
        finding: 'Proposed that habits are triggered by context cues, often independent of a person\'s current goals.',
      },
      {
        cite: 'Wood, W., & Rünger, D. (2016). Psychology of habit. Annual Review of Psychology, 67, 289–314.',
        finding: 'Reviewed evidence that habits are cued by context, and that changing the context is an effective way to change them.',
      },
    ],
  },
  {
    id: 'temptation-bundling',
    group: 'keeping',
    title: 'Temptation bundling',
    line: 'Saving something you enjoy for only while you do the hard thing can pull you toward it.',
    body: [
      'In one study, people who could only listen to gripping audiobooks while at the gym went to the gym more often than people who could listen anywhere.',
      'The effect faded over the following weeks, especially after a holiday break. A bundle can help you start, but it won\'t do all the work on its own.',
    ],
    tryThis: {
      text: 'Pick one playlist or one show you only allow yourself during your promise.',
    },
    sources: [
      {
        cite: 'Milkman, K. L., Minson, J. A., & Volpp, K. G. M. (2014). Holding the Hunger Games hostage at the gym: An evaluation of temptation bundling. Management Science, 60(2), 283–299.',
        finding: 'Restricting tempting audiobooks to the gym increased gym visits at first; the effect declined over time, especially after a holiday break.',
      },
    ],
  },
  {
    id: 'stuck-in-the-middle',
    group: 'keeping',
    title: 'Stuck in the middle',
    line: 'Effort tends to rise near the end of a goal — and the middle is where it sags.',
    body: [
      'Coffee-card customers bought coffee more often the closer they got to a free one. People push harder when the finish feels near.',
      'Other research found motivation tends to be highest at the start and the end, and lowest in the middle. If week two of an era feels flat, that dip is common.',
    ],
    tryThis: {
      text: 'In the middle of an era, count the days left instead of the days done.',
      href: '/era',
      cta: 'Your era',
    },
    sources: [
      {
        cite: 'Kivetz, R., Urminsky, O., & Zheng, Y. (2006). The goal-gradient hypothesis resurrected: Purchase acceleration, illusionary goal progress, and customer retention. Journal of Marketing Research, 43(1), 39–58.',
        finding: 'Coffee-card customers bought more often as they neared a free coffee; a 12-stamp card with 2 stamps already given was completed faster than a 10-stamp card.',
      },
      {
        cite: 'Bonezzi, A., Brendl, C. M., & De Angelis, M. (2011). Stuck in the middle: The psychophysics of goal pursuit. Psychological Science, 22(5), 607–612.',
        finding: 'Motivation tended to be higher at the beginning and end of a goal and lower in the middle.',
      },
    ],
  },
  {
    id: 'small-wins',
    group: 'keeping',
    title: 'Small wins',
    line: 'Making progress — even small progress — was the most common feature of people\'s best days.',
    body: [
      'Researchers read about 12,000 daily diary entries from people at work. On the days people felt best, the most common event was simply making progress on work that mattered to them.',
      'Progress you can see feeds the next day\'s effort. That\'s what Proof is for: a record of the days you kept, which no single bad day can undo.',
    ],
    tryThis: {
      text: 'Look back over the last week in Proof and count what you actually did.',
      href: '/proof',
      cta: 'See your Proof',
    },
    sources: [
      {
        cite: 'Amabile, T. M., & Kramer, S. J. (2011). The Progress Principle: Using small wins to ignite joy, engagement, and creativity at work. Harvard Business Review Press.',
        finding: 'In about 12,000 diary entries, making progress in meaningful work was the most common event on people\'s best days.',
      },
    ],
  },
  {
    id: 'attention-residue',
    group: 'keeping',
    title: 'Attention residue',
    line: 'Part of your mind stays on the last task when you switch — especially an unfinished one.',
    body: [
      'Switching away from a task you didn\'t finish leaves "residue": part of your attention stays on it, and you perform worse on the next thing.',
      'A later study found a simple fix. Before switching, people wrote a quick note on where they stopped and what came next. That reduced the residue.',
    ],
    tryThis: {
      text: 'Before your promise, write one line about where you left whatever you were doing.',
    },
    sources: [
      {
        cite: 'Leroy, S. (2009). Why is it so hard to do my work? The challenge of attention residue when switching between work tasks. Organizational Behavior and Human Decision Processes, 109(2), 168–181.',
        finding: 'People switching away from an unfinished task carried attention residue and performed worse on the next task.',
      },
      {
        cite: 'Leroy, S., & Glomb, T. M. (2018). Tasks interrupted: How anticipating time pressure on resumption of an interrupted task causes attention residue and low performance on interrupting tasks and how a "ready-to-resume" plan mitigates the effects. Organization Science, 29(3), 380–397.',
        finding: 'A brief "ready-to-resume" plan reduced attention residue and improved performance on the interrupting task.',
      },
    ],
  },

  // ── After a miss ────────────────────────────────────────────────────────
  {
    id: 'the-miss-loop',
    group: 'miss',
    title: 'The miss loop',
    line: 'After a slip, it\'s the "I\'ve blown it anyway" thought that turns one miss into many.',
    body: [
      'Relapse research describes a common pattern. After a lapse, people who blame something fixed about themselves ("I have no willpower") are more likely to give up altogether than people who see it as a one-off with a cause.',
      'A classic eating study found the same "might as well" logic: restrained eaters who thought their diet was already broken for the day then ate more, not less.',
    ],
    loop: {
      trigger: 'You miss a day.',
      thought: '"I\'ve already broken it."',
      behavior: 'You skip the next day too.',
      outcome: 'One miss becomes a run of them.',
      newLoop: 'Make tomorrow\'s promise easy on purpose. Keeping it matters more than its size.',
    },
    tryThis: {
      text: 'After a miss, promise something small enough that you can\'t fail it tomorrow.',
      href: '/',
      cta: 'Make today\'s promise',
    },
    sources: [
      {
        cite: 'Marlatt, G. A., & Gordon, J. R. (Eds.) (1985). Relapse Prevention: Maintenance Strategies in the Treatment of Addictive Behaviors. Guilford Press.',
        finding: 'Described the abstinence violation effect: blaming a lapse on internal, stable causes makes a full relapse more likely.',
      },
      {
        cite: 'Herman, C. P., & Mack, D. (1975). Restrained and unrestrained eating. Journal of Personality, 43(4), 647–660.',
        finding: 'Restrained eaters ate more, not less, after being made to drink a milkshake first, as if the day was already lost.',
      },
    ],
  },
  {
    id: 'self-compassion',
    group: 'miss',
    title: 'Kindness after failing',
    line: 'Being kind to yourself after a failure made people try harder to improve, not less.',
    body: [
      'It seems as if being hard on yourself would push you. In a set of experiments, people who were encouraged to treat a failure with self-compassion studied longer for a retest than people who got a self-esteem boost or nothing at all.',
      'Kindness isn\'t lowering the bar. It makes it safe to look straight at what went wrong — and that is what you need in order to fix it.',
    ],
    tryThis: {
      text: 'Answer a miss the way you\'d answer a friend\'s, then pick the next small step.',
    },
    sources: [
      {
        cite: 'Breines, J. G., & Chen, S. (2012). Self-compassion increases self-improvement motivation. Personality and Social Psychology Bulletin, 38(9), 1133–1143.',
        finding: 'After failing a difficult test, people induced to be self-compassionate spent more time studying for a retest than comparison groups.',
      },
    ],
  },
  {
    id: 'self-efficacy',
    group: 'miss',
    title: 'Confidence is built from doing',
    line: 'Belief that you can do something grows most from having done it.',
    body: [
      'Psychologists call it self-efficacy: your belief that you can carry out a particular thing. Of the ways it grows, the strongest is mastery experience — actually succeeding at it yourself.',
      'Pep talks and watching others help a bit. A record of promises you kept helps more. That\'s why a small promise kept beats a big one broken.',
    ],
    tryThis: {
      text: 'Keep promises small enough to keep for a week, then raise them a little.',
      href: '/patterns',
      cta: 'See your laws',
    },
    sources: [
      {
        cite: 'Bandura, A. (1977). Self-efficacy: Toward a unifying theory of behavioral change. Psychological Review, 84(2), 191–215.',
        finding: 'Proposed self-efficacy and identified performance accomplishments (mastery experiences) as its most dependable source.',
      },
    ],
  },

  // ── In your head ────────────────────────────────────────────────────────
  {
    id: 'reframing',
    group: 'mind',
    title: 'Reframing',
    line: 'Changing how you read a situation changes how it feels — more than pushing the feeling down.',
    body: [
      'Researchers compare two ways of handling a feeling. Suppressing it means holding it in. Reappraising it means re-reading the situation more accurately. Reappraisal reduced the negative feeling. Suppression didn\'t, and it cost more effort and memory.',
      'A reframe isn\'t forced positivity. "I wasted the whole day" becomes "most of today didn\'t go how I wanted, and the next hour is still mine". That\'s more accurate, and it gives you something to do next.',
    ],
    tryThis: {
      text: 'When a day goes sideways, try the reset — it walks you back in without pretending things went fine.',
      href: '/reset',
      cta: 'Open the reset',
    },
    sources: [
      {
        cite: 'Gross, J. J. (2002). Emotion regulation: Affective, cognitive, and social consequences. Psychophysiology, 39(3), 281–291.',
        finding: 'Reappraisal reduced negative emotional experience; suppression did not, and carried physiological and memory costs.',
      },
    ],
  },
]

export const LESSON_BY_ID = new Map(LESSONS.map(l => [l.id, l]))

/**
 * The lesson related to each kind of law on /patterns. "Related", never
 * "why": a pattern in someone's record is not proof of the mechanism.
 */
export const LESSON_FOR_PATTERN: Partial<Record<PatternKind, string>> = {
  timing: 'if-then-plans',
  follow_through: 'if-then-plans',
  weekday: 'cues-and-friction',
  helper: 'cues-and-friction',
  size: 'planning-fallacy',
  momentum: 'the-miss-loop',
  confidence: 'self-efficacy',
  blocker: 'mental-contrasting',
  stress: 'reframing',
  discipline: 'habits-take-time',
}

/**
 * The idea each experiment puts to the test. Guide-first has none: no study
 * here tests a guided session before a promise, and a near-miss lesson
 * would claim more than it shows.
 */
export const LESSON_FOR_EXPERIMENT: Partial<Record<ExperimentDef['key'], string>> = {
  morning_promise: 'if-then-plans',
  small_promise: 'planning-fallacy',
}

/** Minutes to read it, from its own words at 200 a minute — at least 1. */
export function readMinutes(l: Lesson): number {
  const text = [l.line, ...l.body, l.tryThis.text, ...(l.loop ? Object.values(l.loop) : []), ...l.sources.map(s => s.finding)].join(' ')
  return Math.max(1, Math.ceil(text.split(/\s+/).filter(Boolean).length / 200))
}

/** Lessons related to their solid laws, in law order, no repeats. */
export function lessonsForLaws(kinds: readonly PatternKind[]): Lesson[] {
  const ids = [...new Set(kinds.map(k => LESSON_FOR_PATTERN[k]).filter((x): x is string => !!x))]
  return ids.map(id => LESSON_BY_ID.get(id)).filter((l): l is Lesson => !!l)
}

/**
 * Premium gating (Francis, 2026-10-03): ONE lesson per group is free — the
 * first in each — so everyone tastes the library; the rest are Premium.
 * A soft lock, like the guided voices (isContentFree): the words ship with
 * the app, the screen shows a preview and the upgrade.
 */
export const FREE_LESSON_IDS: ReadonlySet<string> = new Set(
  LESSON_GROUPS.map(g => LESSONS.find(l => l.group === g.key)?.id).filter((id): id is string => !!id),
)

export function lessonUnlocked(id: string, isPremium: boolean): boolean {
  return isPremium || FREE_LESSON_IDS.has(id)
}
