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
  // The compound patterns a session is built from.
  | 'squat'
  | 'hinge'
  | 'horizontal_push'
  | 'horizontal_pull'
  | 'vertical_push'
  | 'vertical_pull'
  | 'single_leg'
  | 'core'
  | 'carry'
  // One joint at a time. Named by the joint and the direction, because
  // that is the honest description — "arms day" isn't a pattern.
  | 'elbow_flexion'
  | 'elbow_extension'
  | 'lateral_raise'
  | 'knee_flexion'
  | 'knee_extension'
  | 'calf'

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
   * Overrides the pattern's regions, for the rare movement that genuinely
   * differs from its family. Left off almost everywhere on purpose.
   */
  regions?: Region[]
  /**
   * Reviewed technique guidance. Empty everywhere on purpose: writing it is
   * a qualified professional's job, and the app says so rather than
   * guessing (MOVEMENT_TECHNIQUE_PENDING).
   */
  technique?: MovementTechnique
}

/**
 * The reviewed half of a movement: the words a qualified person put their
 * name to.
 *
 * Shaped like the screen it fills — numbered steps, short cues, the
 * mistakes worth naming, and the callouts pinned onto the hero image. All
 * of it arrives together or not at all: a reviewer approves the picture and
 * the words as one thing, because an arrow pointing at a body is a claim
 * about that body.
 *
 * `reviewedBy` is a person, not a company and not "Voxu". If nobody can be
 * named, this object doesn't exist and the screen says so.
 */
export interface MovementTechnique {
  reviewedBy: string
  /** ISO date, so the screen can show how old the guidance is. */
  reviewedOn: string
  steps: string[]
  /** Three or four words each, the mockup's "key cues" row. */
  cues?: { label: string; detail?: string }[]
  /** What goes wrong, named without blame. */
  mistakes?: { label: string; detail?: string }[]
  /**
   * Labels pinned to the hero image, positioned as percentages of it.
   *
   * Overlaid by the app rather than baked into the picture, so a cue can be
   * corrected, translated or withdrawn without regenerating art — and so
   * no text ever gets rendered by an image model.
   */
  callouts?: { label: string; detail?: string; x: number; y: number; side: 'left' | 'right' }[]
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
  carry: 'Carry',
  elbow_flexion: 'Elbow flexion',
  elbow_extension: 'Elbow extension',
  lateral_raise: 'Lateral raise',
  knee_flexion: 'Knee flexion',
  knee_extension: 'Knee extension',
  calf: 'Calf',
}

/**
 * Whether more than one joint moves.
 *
 * A property of the pattern, not a judgement about the exercise: a squat
 * bends the knees and the hips, a curl bends the elbow. Derived per
 * pattern so nobody has to make forty-two separate calls — and so the
 * answer can't be inconsistent between two squats.
 *
 * Says nothing about which is better. Both words appear on gym equipment
 * and in every programme ever written; they describe the movement, not its
 * worth.
 */
export type Mechanic = 'compound' | 'isolation'

export const MECHANIC_BY_PATTERN: Record<MovementPattern, Mechanic> = {
  squat: 'compound',
  hinge: 'compound',
  horizontal_push: 'compound',
  horizontal_pull: 'compound',
  vertical_push: 'compound',
  vertical_pull: 'compound',
  single_leg: 'compound',
  carry: 'compound',
  core: 'isolation',
  elbow_flexion: 'isolation',
  elbow_extension: 'isolation',
  lateral_raise: 'isolation',
  knee_flexion: 'isolation',
  knee_extension: 'isolation',
  calf: 'isolation',
}

/**
 * Broad regions, and deliberately only broad ones.
 *
 * "Quads and glutes" is the kind of thing printed on the machine. "Vastus
 * medialis, 34%" is a claim about a body the app cannot see, so the list
 * stops at regions a person can point to. Also derived per pattern: a
 * front squat and a back squat train the same thing, and two per-movement
 * lists would eventually disagree with each other.
 */
export type Region =
  | 'quads'
  | 'glutes'
  | 'hamstrings'
  | 'back'
  | 'chest'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'core'
  | 'calves'
  | 'grip'

export const REGION_LABELS: Record<Region, string> = {
  quads: 'Quads',
  glutes: 'Glutes',
  hamstrings: 'Hamstrings',
  back: 'Back',
  chest: 'Chest',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  core: 'Core',
  calves: 'Calves',
  grip: 'Grip',
}

export const PATTERN_REGIONS: Record<MovementPattern, Region[]> = {
  squat: ['quads', 'glutes'],
  hinge: ['hamstrings', 'glutes', 'back'],
  single_leg: ['quads', 'glutes'],
  horizontal_push: ['chest', 'shoulders', 'triceps'],
  vertical_push: ['shoulders', 'triceps'],
  horizontal_pull: ['back', 'biceps'],
  vertical_pull: ['back', 'biceps'],
  core: ['core'],
  carry: ['grip', 'core'],
  elbow_flexion: ['biceps'],
  elbow_extension: ['triceps'],
  lateral_raise: ['shoulders'],
  knee_flexion: ['hamstrings'],
  knee_extension: ['quads'],
  calf: ['calves'],
}

export function mechanicOf(movement: Movement): Mechanic {
  return MECHANIC_BY_PATTERN[movement.pattern]
}

export function regionsOf(movement: Movement): Region[] {
  return movement.regions ?? PATTERN_REGIONS[movement.pattern]
}

/**
 * What belongs in each family.
 *
 * Taxonomy, not coaching: each line says which movements are relatives of
 * each other, which is the fact that makes a swap possible. No imperative,
 * no cue, nothing anyone is told to do with their body — a test enforces
 * that, because this is the exact place a "keep your chest up" would feel
 * natural to write.
 */
export const PATTERN_MEANS: Record<MovementPattern, string> = {
  squat: 'Bending at the knees and hips — squats and their relatives.',
  hinge: 'Bending at the hips — deadlifts and their relatives.',
  single_leg: 'One leg at a time — lunges, step-ups, split squats.',
  horizontal_push: 'Pushing away from the chest — presses and push-ups.',
  vertical_push: 'Pressing overhead.',
  horizontal_pull: 'Pulling toward the torso — rows.',
  vertical_pull: 'Pulling down, or pulling yourself up.',
  core: 'Holding the middle still while something pulls on it.',
  carry: 'Holding something heavy and walking with it.',
  elbow_flexion: 'The elbow closing — curls.',
  elbow_extension: 'The elbow opening — pushdowns, extensions, dips.',
  lateral_raise: 'The arm lifting out to the side.',
  knee_flexion: 'The knee closing — leg curls.',
  knee_extension: 'The knee opening — leg extensions.',
  calf: 'Rising onto the toes.',
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
    // "chin up" is NOT an alias here. It was, before the chin-up existed as
    // its own movement — and then it quietly shadowed the real one, so
    // somebody typing "chin ups" got sent to the pull-up's screen.
    aliases: ['pullup'],
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
  {
    id: 'side_plank',
    name: 'Side plank',
    pattern: 'core',
    equipment: ['bodyweight'],
    level: 'simplest',
  },
  {
    id: 'inverted_row',
    name: 'Inverted row',
    pattern: 'horizontal_pull',
    equipment: ['bodyweight', 'rack'],
    level: 'simplest',
    aliases: ['bodyweight row'],
    pick: 'The pull you can do with a bar and no weights.',
  },
  {
    id: 'band_row_single',
    name: 'Single-arm band row',
    pattern: 'horizontal_pull',
    equipment: ['band'],
    level: 'simplest',
  },
  {
    id: 'dip',
    name: 'Dip',
    pattern: 'horizontal_push',
    equipment: ['bodyweight'],
    level: 'advanced',
    pick: 'Needs bars. The hardest push here with no weights.',
  },
  {
    id: 'chin_up',
    name: 'Chin-up',
    pattern: 'vertical_pull',
    equipment: ['bodyweight'],
    level: 'advanced',
  },
  {
    id: 'kettlebell_swing',
    name: 'Kettlebell swing',
    pattern: 'hinge',
    equipment: ['kettlebell'],
    level: 'standard',
  },
  {
    id: 'glute_bridge',
    name: 'Glute bridge',
    pattern: 'hinge',
    equipment: ['bodyweight'],
    level: 'simplest',
    pick: 'Floor, no kit.',
  },
  {
    id: 'good_morning',
    name: 'Good morning',
    pattern: 'hinge',
    equipment: ['barbell'],
    level: 'advanced',
  },
  {
    id: 'ab_wheel',
    name: 'Ab wheel rollout',
    pattern: 'core',
    equipment: ['bodyweight'],
    level: 'advanced',
    pick: 'Needs a wheel, and a lot more than it looks like.',
  },

  // ── Carry ───────────────────────────────────────────────────────────────
  {
    id: 'farmers_carry',
    name: 'Farmer’s carry',
    pattern: 'carry',
    equipment: ['dumbbell', 'kettlebell'],
    level: 'simplest',
    aliases: ['farmers walk', 'farmer walk'],
    pick: 'Needs floor to walk on, nothing else.',
  },
  {
    id: 'suitcase_carry',
    name: 'Suitcase carry',
    pattern: 'carry',
    equipment: ['dumbbell', 'kettlebell'],
    level: 'standard',
    pick: 'One side only.',
  },
  {
    id: 'front_rack_carry',
    name: 'Front-rack carry',
    pattern: 'carry',
    equipment: ['kettlebell', 'dumbbell'],
    level: 'standard',
  },

  // ── Elbow flexion ───────────────────────────────────────────────────────
  {
    id: 'dumbbell_curl',
    name: 'Dumbbell curl',
    pattern: 'elbow_flexion',
    equipment: ['dumbbell'],
    level: 'simplest',
    aliases: ['bicep curl', 'biceps curl', 'db curl'],
  },
  {
    id: 'barbell_curl',
    name: 'Barbell curl',
    pattern: 'elbow_flexion',
    equipment: ['barbell'],
    level: 'standard',
  },
  {
    id: 'cable_curl',
    name: 'Cable curl',
    pattern: 'elbow_flexion',
    equipment: ['cable'],
    level: 'standard',
  },
  {
    id: 'band_curl',
    name: 'Band curl',
    pattern: 'elbow_flexion',
    equipment: ['band'],
    level: 'simplest',
    pick: 'Packs into a bag.',
  },

  // ── Elbow extension ─────────────────────────────────────────────────────
  {
    id: 'bench_dip',
    name: 'Bench dip',
    pattern: 'elbow_extension',
    equipment: ['bodyweight', 'bench'],
    level: 'simplest',
    pick: 'Needs a bench, a chair or a step.',
  },
  {
    id: 'cable_pushdown',
    name: 'Cable pushdown',
    pattern: 'elbow_extension',
    equipment: ['cable'],
    level: 'simplest',
    aliases: ['tricep pushdown', 'triceps pushdown'],
  },
  {
    id: 'overhead_cable_extension',
    name: 'Overhead cable extension',
    pattern: 'elbow_extension',
    equipment: ['cable'],
    level: 'standard',
  },
  {
    id: 'skull_crusher',
    name: 'Skull crusher',
    pattern: 'elbow_extension',
    equipment: ['barbell', 'dumbbell', 'bench'],
    level: 'standard',
  },
  {
    id: 'band_pushdown',
    name: 'Band pushdown',
    pattern: 'elbow_extension',
    equipment: ['band'],
    level: 'simplest',
  },

  // ── Lateral raise ───────────────────────────────────────────────────────
  {
    id: 'dumbbell_lateral_raise',
    name: 'Dumbbell lateral raise',
    pattern: 'lateral_raise',
    equipment: ['dumbbell'],
    level: 'simplest',
    aliases: ['lateral raise', 'side raise', 'lat raise'],
  },
  {
    id: 'cable_lateral_raise',
    name: 'Cable lateral raise',
    pattern: 'lateral_raise',
    equipment: ['cable'],
    level: 'standard',
  },
  {
    id: 'band_lateral_raise',
    name: 'Band lateral raise',
    pattern: 'lateral_raise',
    equipment: ['band'],
    level: 'simplest',
  },
  {
    id: 'machine_lateral_raise',
    name: 'Machine lateral raise',
    pattern: 'lateral_raise',
    equipment: ['machine'],
    level: 'simplest',
    pick: 'The machine holds the path for you.',
  },

  // ── Knee flexion ────────────────────────────────────────────────────────
  {
    id: 'leg_curl',
    name: 'Leg curl',
    pattern: 'knee_flexion',
    equipment: ['machine'],
    level: 'simplest',
    aliases: ['hamstring curl', 'seated leg curl', 'lying leg curl'],
  },
  {
    id: 'slider_leg_curl',
    name: 'Slider leg curl',
    pattern: 'knee_flexion',
    equipment: ['bodyweight'],
    level: 'standard',
    pick: 'Needs a slippery floor or a towel.',
  },
  {
    id: 'nordic_curl',
    name: 'Nordic curl',
    pattern: 'knee_flexion',
    equipment: ['bodyweight'],
    level: 'advanced',
    pick: 'Needs something to hold your ankles.',
  },
  {
    id: 'band_leg_curl',
    name: 'Band leg curl',
    pattern: 'knee_flexion',
    equipment: ['band'],
    level: 'simplest',
  },

  // ── Knee extension ──────────────────────────────────────────────────────
  {
    id: 'leg_extension',
    name: 'Leg extension',
    pattern: 'knee_extension',
    equipment: ['machine'],
    level: 'simplest',
  },
  {
    id: 'band_leg_extension',
    name: 'Band leg extension',
    pattern: 'knee_extension',
    equipment: ['band'],
    level: 'simplest',
  },
  {
    id: 'reverse_nordic',
    name: 'Reverse Nordic',
    pattern: 'knee_extension',
    equipment: ['bodyweight'],
    level: 'advanced',
  },
  {
    id: 'sissy_squat',
    name: 'Sissy squat',
    pattern: 'knee_extension',
    equipment: ['bodyweight'],
    level: 'advanced',
  },

  // ── Calf ────────────────────────────────────────────────────────────────
  {
    id: 'bodyweight_calf_raise',
    name: 'Calf raise',
    pattern: 'calf',
    equipment: ['bodyweight'],
    level: 'simplest',
    aliases: ['standing calf raise'],
  },
  {
    id: 'dumbbell_calf_raise',
    name: 'Dumbbell calf raise',
    pattern: 'calf',
    equipment: ['dumbbell'],
    level: 'simplest',
  },
  {
    id: 'machine_calf_raise',
    name: 'Machine calf raise',
    pattern: 'calf',
    equipment: ['machine'],
    level: 'simplest',
  },
  {
    id: 'seated_calf_raise',
    name: 'Seated calf raise',
    pattern: 'calf',
    equipment: ['machine'],
    level: 'simplest',
  },
]

export const MOVEMENTS_BY_ID = new Map(MOVEMENTS.map(m => [m.id, m]))

/**
 * The library grouped for browsing, simplest option first inside each
 * pattern.
 *
 * Ordered by pattern the way a session tends to be built — legs, then
 * pushes and pulls, then the middle. Not a recommendation about order: it's
 * a list, and the person picks.
 */
export const PATTERN_ORDER: MovementPattern[] = [
  'squat',
  'hinge',
  'single_leg',
  'horizontal_push',
  'vertical_push',
  'horizontal_pull',
  'vertical_pull',
  'core',
  'carry',
  // The one-joint patterns last: they're what gets added to a session, not
  // what a session is built from.
  'lateral_raise',
  'elbow_flexion',
  'elbow_extension',
  'knee_extension',
  'knee_flexion',
  'calf',
]

const LEVEL_RANK: Record<MovementLevel, number> = { simplest: 0, standard: 1, advanced: 2 }

export function movementsByPattern(): { pattern: MovementPattern; movements: Movement[] }[] {
  return PATTERN_ORDER.map(pattern => ({
    pattern,
    movements: MOVEMENTS
      .filter(m => m.pattern === pattern)
      .sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || a.name.localeCompare(b.name)),
  })).filter(group => group.movements.length > 0)
}

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
