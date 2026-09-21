/**
 * The movement library: what you can do instead.
 *
 * WHAT THIS IS. A map of common movements grouped by the pattern they
 * train, tagged with the equipment they need and roughly how much skill
 * they ask for. Its job is substitution: the bench is taken, the gym is
 * shut, your shoulder is unhappy — here are other things that train the
 * same pattern.
 *
 * WHAT THIS IS DELIBERATELY NOT. It does not teach technique. There are no
 * setup steps, no cues, no "common mistakes", no rep ranges, no loads, and
 * no claims about what the evidence says. Voxu does not know anyone's body,
 * their history or their equipment, and unreviewed form instruction at scale
 * is the one thing in this app that could actually hurt somebody. The
 * `technique` field exists on every movement and is deliberately empty until
 * a qualified reviewer writes it — see MOVEMENT_TECHNIQUE_PENDING, which is
 * what the UI shows in its place.
 *
 * Everything that IS here is checkable: a lat pulldown is a vertical pull,
 * it needs a machine, and it is lower-skill than a pull-up. Somebody can
 * disagree with the level ordering; nobody gets injured by it.
 */

export type MovementPattern =
  | 'squat'
  | 'hinge'
  | 'horizontal_push'
  | 'horizontal_pull'
  | 'vertical_push'
  | 'vertical_pull'
  | 'single_leg'
  | 'core'

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'band'
  | 'bench'
  | 'rack'
  | 'kettlebell'

/** How much practice the movement asks for before it feels controllable. */
export type MovementLevel = 'simplest' | 'standard' | 'advanced'

export interface Movement {
  id: string
  name: string
  pattern: MovementPattern
  equipment: Equipment[]
  level: MovementLevel
  /**
   * Why someone would pick THIS one — about the choice, not about form.
   * Never "best for hypertrophy": that is a claim about evidence this file
   * has no business making.
   */
  pick?: string
  /** What people also call it, for matching a typed row. */
  aliases?: string[]
  /**
   * Reviewed technique guidance. Empty everywhere on purpose: writing it is
   * a qualified professional's job, and the app says so rather than
   * guessing (MOVEMENT_TECHNIQUE_PENDING).
   */
  technique?: {
    reviewedBy: string
    reviewedOn: string
    steps: string[]
  }
}

export const PATTERN_LABELS: Record<MovementPattern, string> = {
  squat: 'Squat',
  hinge: 'Hinge',
  horizontal_push: 'Horizontal push',
  horizontal_pull: 'Horizontal pull',
  vertical_push: 'Vertical push',
  vertical_pull: 'Vertical pull',
  single_leg: 'Single leg',
  core: 'Core',
}

export const MOVEMENTS: Movement[] = [
  // ── Squat ───────────────────────────────────────────────────────────────
  {
    id: 'back_squat',
    name: 'Back squat',
    pattern: 'squat',
    equipment: ['barbell', 'rack'],
    level: 'advanced',
    pick: 'Heaviest loading, most setup and most skill.',
    aliases: ['squat', 'barbell squat', 'bb squat'],
  },
  {
    id: 'front_squat',
    name: 'Front squat',
    pattern: 'squat',
    equipment: ['barbell', 'rack'],
    level: 'advanced',
    aliases: ['fs'],
  },
  {
    id: 'goblet_squat',
    name: 'Goblet squat',
    pattern: 'squat',
    equipment: ['dumbbell', 'kettlebell'],
    level: 'simplest',
    pick: 'One weight, no rack, easiest to control.',
  },
  {
    id: 'leg_press',
    name: 'Leg press',
    pattern: 'squat',
    equipment: ['machine'],
    level: 'simplest',
    pick: 'Supported, so balance is not part of the job.',
  },
  {
    id: 'hack_squat',
    name: 'Hack squat',
    pattern: 'squat',
    equipment: ['machine'],
    level: 'standard',
  },
  {
    id: 'bodyweight_squat',
    name: 'Bodyweight squat',
    pattern: 'squat',
    equipment: ['bodyweight'],
    level: 'simplest',
    pick: 'No equipment at all.',
    aliases: ['air squat'],
  },

  // ── Hinge ───────────────────────────────────────────────────────────────
  {
    id: 'deadlift',
    name: 'Deadlift',
    pattern: 'hinge',
    equipment: ['barbell'],
    level: 'advanced',
    aliases: ['conventional deadlift', 'bb deadlift'],
  },
  {
    id: 'trap_bar_deadlift',
    name: 'Trap-bar deadlift',
    pattern: 'hinge',
    equipment: ['barbell'],
    level: 'standard',
    pick: 'Handles at your sides, which most people find easier to hold.',
    aliases: ['hex bar deadlift'],
  },
  {
    id: 'romanian_deadlift',
    name: 'Romanian deadlift',
    pattern: 'hinge',
    equipment: ['barbell', 'dumbbell'],
    level: 'standard',
    aliases: ['rdl'],
  },
  {
    id: 'dumbbell_rdl',
    name: 'Dumbbell RDL',
    pattern: 'hinge',
    equipment: ['dumbbell'],
    level: 'simplest',
    pick: 'No bar to load; works with whatever weights you have.',
  },
  {
    id: 'hip_thrust',
    name: 'Hip thrust',
    pattern: 'hinge',
    equipment: ['barbell', 'bench'],
    level: 'standard',
  },
  {
    id: 'back_extension',
    name: 'Back extension',
    pattern: 'hinge',
    equipment: ['machine', 'bodyweight'],
    level: 'simplest',
  },

  // ── Horizontal push ─────────────────────────────────────────────────────
  {
    id: 'bench_press',
    name: 'Bench press',
    pattern: 'horizontal_push',
    equipment: ['barbell', 'bench', 'rack'],
    level: 'advanced',
    aliases: ['bench', 'barbell bench', 'bb bench', 'flat bench'],
  },
  {
    id: 'dumbbell_bench',
    name: 'Dumbbell bench press',
    pattern: 'horizontal_push',
    equipment: ['dumbbell', 'bench'],
    level: 'standard',
    pick: 'Each arm works on its own.',
    aliases: ['db bench', 'dumbbell press'],
  },
  {
    id: 'incline_dumbbell_press',
    name: 'Incline dumbbell press',
    pattern: 'horizontal_push',
    equipment: ['dumbbell', 'bench'],
    level: 'standard',
    aliases: ['incline db press', 'incline press'],
  },
  {
    id: 'machine_chest_press',
    name: 'Machine chest press',
    pattern: 'horizontal_push',
    equipment: ['machine'],
    level: 'simplest',
    pick: 'Fixed path, no spotter, nothing to balance.',
    aliases: ['chest press'],
  },
  {
    id: 'floor_press',
    name: 'Floor press',
    pattern: 'horizontal_push',
    equipment: ['dumbbell'],
    level: 'simplest',
    pick: 'No bench needed — the floor is the bench.',
  },
  {
    id: 'push_up',
    name: 'Push-up',
    pattern: 'horizontal_push',
    equipment: ['bodyweight'],
    level: 'simplest',
    pick: 'No equipment, anywhere.',
    aliases: ['pushup', 'press up'],
  },

  // ── Horizontal pull ─────────────────────────────────────────────────────
  {
    id: 'barbell_row',
    name: 'Barbell row',
    pattern: 'horizontal_pull',
    equipment: ['barbell'],
    level: 'advanced',
    aliases: ['bb row', 'bent over row'],
  },
  {
    id: 'dumbbell_row',
    name: 'One-arm dumbbell row',
    pattern: 'horizontal_pull',
    equipment: ['dumbbell', 'bench'],
    level: 'simplest',
    pick: 'Supported, one side at a time.',
    aliases: ['db row', 'single arm row'],
  },
  {
    id: 'cable_row',
    name: 'Seated cable row',
    pattern: 'horizontal_pull',
    equipment: ['cable', 'machine'],
    level: 'simplest',
    aliases: ['seated row', 'cable row'],
  },
  {
    id: 'chest_supported_row',
    name: 'Chest-supported row',
    pattern: 'horizontal_pull',
    equipment: ['machine', 'bench', 'dumbbell'],
    level: 'simplest',
    pick: 'Your chest takes the support, so your back does the pulling.',
  },
  {
    id: 'band_row',
    name: 'Band row',
    pattern: 'horizontal_pull',
    equipment: ['band'],
    level: 'simplest',
    pick: 'Packs in a bag; works at home.',
  },

  // ── Vertical push ───────────────────────────────────────────────────────
  {
    id: 'overhead_press',
    name: 'Overhead press',
    pattern: 'vertical_push',
    equipment: ['barbell', 'rack'],
    level: 'advanced',
    aliases: ['ohp', 'shoulder press', 'military press'],
  },
  {
    id: 'dumbbell_shoulder_press',
    name: 'Dumbbell shoulder press',
    pattern: 'vertical_push',
    equipment: ['dumbbell'],
    level: 'standard',
    aliases: ['db shoulder press', 'db press'],
  },
  {
    id: 'machine_shoulder_press',
    name: 'Machine shoulder press',
    pattern: 'vertical_push',
    equipment: ['machine'],
    level: 'simplest',
  },
  {
    id: 'landmine_press',
    name: 'Landmine press',
    pattern: 'vertical_push',
    equipment: ['barbell'],
    level: 'standard',
    pick: 'An angled path, which some people find kinder overhead.',
  },
  {
    id: 'pike_push_up',
    name: 'Pike push-up',
    pattern: 'vertical_push',
    equipment: ['bodyweight'],
    level: 'standard',
  },

  // ── Vertical pull ───────────────────────────────────────────────────────
  {
    id: 'pull_up',
    name: 'Pull-up',
    pattern: 'vertical_pull',
    equipment: ['bodyweight'],
    level: 'advanced',
    aliases: ['pullup', 'chin up', 'chinup'],
  },
  {
    id: 'assisted_pull_up',
    name: 'Assisted pull-up',
    pattern: 'vertical_pull',
    equipment: ['machine', 'band'],
    level: 'standard',
    pick: 'The same movement with some of your weight taken off.',
  },
  {
    id: 'lat_pulldown',
    name: 'Lat pulldown',
    pattern: 'vertical_pull',
    equipment: ['machine', 'cable'],
    level: 'simplest',
    pick: 'Pick the load, so it works at any strength.',
    aliases: ['pulldown', 'lat pull down'],
  },
  {
    id: 'band_pulldown',
    name: 'Band pulldown',
    pattern: 'vertical_pull',
    equipment: ['band'],
    level: 'simplest',
    pick: 'The home version.',
  },

  // ── Single leg ──────────────────────────────────────────────────────────
  {
    id: 'reverse_lunge',
    name: 'Reverse lunge',
    pattern: 'single_leg',
    equipment: ['bodyweight', 'dumbbell'],
    level: 'simplest',
    aliases: ['lunge', 'lunges'],
  },
  {
    id: 'walking_lunge',
    name: 'Walking lunge',
    pattern: 'single_leg',
    equipment: ['bodyweight', 'dumbbell'],
    level: 'standard',
  },
  {
    id: 'split_squat',
    name: 'Split squat',
    pattern: 'single_leg',
    equipment: ['bodyweight', 'dumbbell'],
    level: 'standard',
  },
  {
    id: 'bulgarian_split_squat',
    name: 'Bulgarian split squat',
    pattern: 'single_leg',
    equipment: ['dumbbell', 'bench'],
    level: 'advanced',
    aliases: ['bss'],
  },
  {
    id: 'step_up',
    name: 'Step-up',
    pattern: 'single_leg',
    equipment: ['bodyweight', 'dumbbell', 'bench'],
    level: 'simplest',
  },

  // ── Core ────────────────────────────────────────────────────────────────
  {
    id: 'plank',
    name: 'Plank',
    pattern: 'core',
    equipment: ['bodyweight'],
    level: 'simplest',
  },
  {
    id: 'dead_bug',
    name: 'Dead bug',
    pattern: 'core',
    equipment: ['bodyweight'],
    level: 'simplest',
  },
  {
    id: 'hanging_knee_raise',
    name: 'Hanging knee raise',
    pattern: 'core',
    equipment: ['bodyweight'],
    level: 'advanced',
  },
  {
    id: 'cable_crunch',
    name: 'Cable crunch',
    pattern: 'core',
    equipment: ['cable', 'machine'],
    level: 'standard',
  },
  {
    id: 'pallof_press',
    name: 'Pallof press',
    pattern: 'core',
    equipment: ['cable', 'band'],
    level: 'standard',
  },
]

export const MOVEMENTS_BY_ID = new Map(MOVEMENTS.map(m => [m.id, m]))

/**
 * Shown wherever technique would go.
 *
 * Said plainly rather than left blank, because a blank space reads as "this
 * app has nothing to say" while this says "this app will not guess".
 */
export const MOVEMENT_TECHNIQUE_PENDING =
  'Voxu doesn’t teach technique. It can tell you what trains the same pattern and what you can do instead — for how to perform it, use a coach, a physio, or a source you trust who can see you move.'

/**
 * The only safety text in the app that is not about consistency.
 *
 * Not technique and not diagnosis: a stop rule. Worth stating because the
 * app is now naming exercises, and somebody who feels the wrong thing
 * should be told to stop rather than to push through.
 */
export const MOVEMENT_STOP_SIGNALS = [
  'Sharp or sudden pain — stop, don’t work around it.',
  'Numbness, tingling or a joint that gives way.',
  'Dizziness, chest pain or breathlessness that isn’t effort.',
  'Anything that feels wrong in a way you can’t explain.',
]

export const MOVEMENT_STOP_NOTE =
  'Stopping a set is free. If any of this happens, stop and — if it keeps happening — talk to someone qualified.'
