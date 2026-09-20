/**
 * Is this difference worth telling someone about, or is it a coin flip?
 *
 * The pattern engine used to surface anything with a 15-point gap and five
 * observations a side. At that size "4 of 5 against 3 of 5" clears the bar —
 * one flipped coin — and with eleven patterns tested per person, some noise
 * was certain to read as insight.
 *
 * Fisher's exact test, because the samples are small and exact is cheap
 * here. Then Holm–Bonferroni across the patterns tested in the same run:
 * testing eleven things at p < 0.05 each means roughly a 43% chance of at
 * least one false positive, which is not a rate to describe someone's life
 * with.
 *
 * Patterns that fail are still SHOWN — with their counts, labelled early —
 * because they're the person's own record and hiding it would be its own
 * kind of lie. What changes is what the app ACTS on: the coach and the
 * wake-up call only ever quote a pattern that survived this.
 */

/** Log factorials, grown on demand. Samples here are days, not millions. */
const logFactorials: number[] = [0, 0]

function logFactorial(n: number): number {
  for (let i = logFactorials.length; i <= n; i++) {
    logFactorials[i] = logFactorials[i - 1] + Math.log(i)
  }
  return logFactorials[n]
}

const logChoose = (n: number, k: number): number =>
  k < 0 || k > n ? -Infinity : logFactorial(n) - logFactorial(k) - logFactorial(n - k)

/**
 * Two-tailed Fisher's exact p for a 2×2 table:
 *
 *            hit          miss
 *   group A  hitsA        nA − hitsA
 *   group B  hitsB        nB − hitsB
 *
 * Returns 1 when there is nothing to test (an empty group), which reads as
 * "no evidence" everywhere it's used.
 */
export function fisherExactTwoTailed(hitsA: number, nA: number, hitsB: number, nB: number): number {
  if (nA <= 0 || nB <= 0) return 1
  if (hitsA < 0 || hitsB < 0 || hitsA > nA || hitsB > nB) return 1

  const n = nA + nB
  const hits = hitsA + hitsB
  if (hits === 0 || hits === n) return 1 // every day the same outcome: nothing to compare

  const denom = logChoose(n, hits)
  const logP = (x: number) => logChoose(nA, x) + logChoose(nB, hits - x) - denom

  const observed = logP(hitsA)
  const lo = Math.max(0, hits - nB)
  const hi = Math.min(nA, hits)

  let p = 0
  for (let x = lo; x <= hi; x++) {
    const lp = logP(x)
    // Sum every table at least as extreme as the observed one. The epsilon
    // keeps floating point from dropping a table that ties the observed
    // probability, which would understate p.
    if (lp <= observed + 1e-9) p += Math.exp(lp)
  }
  return Math.min(1, p)
}

/** The family-wise error rate the whole report is held to. */
export const ALPHA = 0.05

/**
 * Holm–Bonferroni: given the p-values of every comparison tested in one
 * run, returns which of them survive. Order is independent of the caller's
 * order, so the same history always yields the same verdicts.
 */
export function holmSurvivors(pValues: number[], alpha = ALPHA): boolean[] {
  const m = pValues.length
  const survived = new Array<boolean>(m).fill(false)
  if (m === 0) return survived

  const order = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p || a.i - b.i)
  for (let rank = 0; rank < m; rank++) {
    const { p, i } = order[rank]
    // Once one fails, every larger p-value fails too — that's the step-down.
    if (p > alpha / (m - rank)) break
    survived[i] = true
  }
  return survived
}
