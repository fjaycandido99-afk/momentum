/**
 * Home's scene photographs — one per card, drawn behind its content and
 * faded into the card so text always reads against dark.
 *
 * Every path is optional in practice: <SceneImage> hides itself when a file
 * is missing, so a card with no photo yet looks exactly like the plain card.
 * Adding the file is the whole job — no code change.
 *
 * Art rules (lib/illustrations lessons): no text in the image, dark and
 * low-key, subject on the RIGHT (the left is where the words go), and never a
 * painted checkerboard — these are full-bleed photographs, not cut-outs.
 */
export const HOME_SCENES = {
  /** The whole page's backdrop, held still behind the scroll: tall portrait,
   *  dark sky above, mountains and a still lake in the lower half. */
  backdrop: '/scenes/home/backdrop.jpg',
  /** Behind the greeting: a figure on a ridge at dusk, right third. */
  hero: '/scenes/home/hero.jpg',
  /** Today's mission: a desk, an open notebook, a lamp. */
  mission: '/scenes/home/mission.jpg',
  /** Today's promise: mountains at last light. */
  promise: '/scenes/home/promise.jpg',
  /** Today's audio / training: a desk clock and a cup in blue night light. */
  training: '/scenes/home/training.jpg',
  /** Your circle: silhouettes standing together on a ridge. */
  circle: '/scenes/home/circle.jpg',
} as const

export type HomeScene = keyof typeof HOME_SCENES
