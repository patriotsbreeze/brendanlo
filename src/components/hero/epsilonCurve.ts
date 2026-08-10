/**
 * Maps a curve parameter p in [0,1] to the filtration scale epsilon.
 *
 * Pure and three-free so it can be asserted in Node, and so drag, keyboard and
 * autoplay all share exactly one nonlinearity — scrubbing p rather than epsilon
 * is what keeps a vertical drag feeling even.
 *
 * The breakpoints follow the measured edge-birth distribution rather than even
 * thirds: births are heavily skewed (p50 = 0.775), so a linear ramp would spend
 * its first third below epsilon 0.3, where fewer than 400 of 15,000 edges exist
 * and nothing visibly happens.
 */
export function epsilonCurve(p: number): number {
  if (p < 0.28) return (p / 0.28) * 0.42;
  if (p < 0.75) return 0.42 + ((p - 0.28) / 0.47) * 0.44;
  return 0.86 + ((p - 0.75) / 0.25) * 0.14;
}

/**
 * Rest state. epsilonCurve(0.75) = 0.86 is where autoplay settles and where a
 * reduced-motion visitor's single static frame sits — one canonical state.
 */
export const P_REST = 0.75;
