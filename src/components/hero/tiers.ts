/**
 * Point/edge budgets per device tier.
 *
 * Shared so the caption (server-rendered) and the scene (client-only) quote the
 * same numbers — a caption that says "2,400 points" over a 900-point render is
 * exactly the kind of small dishonesty this figure cannot afford.
 */
export const TIERS = {
  full: { points: 2400, edges: 15000 },
  reduced: { points: 900, edges: 5000 },
} as const;

export type TierName = keyof typeof TIERS;
