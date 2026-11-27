import { blank, DYE_CHECK, DYE_MODEL, mulberry32, type Tensor } from "./core.ts";

/* The pass@k audit, as a TOY. The real audit has no results yet; these rates
 * are made up to show the shape of the bug: the released grader takes the
 * last number anywhere in a completion, so every sample also has a small
 * chance q of "hitting" by accident. Strict pass@k grows with p alone;
 * released pass@k grows with p + q, and the gap widens as k grows. */

export const PROBLEMS = { cols: 25, rows: 20 };
const N = PROBLEMS.cols * PROBLEMS.rows;

export interface Problem {
  id: number;
  p: number; // true per-sample solve rate
  q: number; // per-sample chance the sloppy grader credits a wrong completion
}

/** Unbiased pass@k estimator from n samples with c correct (Chen et al.):
 *  1 - C(n - c, k) / C(n, k), computed as a product to stay finite. */
export function passAtKUnbiased(n: number, c: number, k: number) {
  if (n - c < k) return 1;
  let prod = 1;
  for (let i = n - c + 1; i <= n; i++) prod *= 1 - k / i;
  return 1 - prod;
}

/** Expected pass@k for a per-sample success rate s. */
export const passAtK = (s: number, k: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, s)), k);

let cached: Problem[] | null = null;
export function problems(): Problem[] {
  if (cached) return cached;
  const rand = mulberry32(2025);
  const out: Problem[] = [];
  for (let id = 0; id < N; id++) {
    const roll = rand();
    const p =
      roll < 0.32 ? 0.35 + rand() * 0.6 : roll < 0.62 ? 0.004 + rand() * 0.2 : rand() * 0.0003;
    // Problems with small integer answers are the ones a rambling sample hits by luck.
    const q = rand() < 0.75 ? 0.0015 + rand() * 0.02 : 0;
    out.push({ id, p, q });
  }
  // Easy problems in front, hard ones at the back, so the field reads as terrain.
  out.sort((a, b) => b.p - a.p);
  // Shuffle within each row so rows are not perfectly ordered left to right.
  for (let r = 0; r < PROBLEMS.rows; r++) {
    const row = out.slice(r * PROBLEMS.cols, (r + 1) * PROBLEMS.cols);
    for (let i = row.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [row[i], row[j]] = [row[j], row[i]];
    }
    out.splice(r * PROBLEMS.cols, PROBLEMS.cols, ...row);
  }
  cached = out;
  return out;
}

export type Grader = "released" | "strict";
export interface RlvrView {
  log2k: number; // 0..10
  grader: Grader;
}
export const rlvrDefaultView: RlvrView = { log2k: 8, grader: "released" };

export const kOf = (log2k: number) => Math.pow(2, log2k);

export function rlvrSummary(view: RlvrView) {
  const k = kOf(view.log2k);
  let strict = 0;
  let released = 0;
  let lucky = 0;
  for (const pr of problems()) {
    const s = passAtK(pr.p, k);
    const r = passAtK(pr.p + pr.q, k);
    strict += s;
    released += r;
    if (r >= 0.5 && s < 0.5) lucky++;
  }
  return { k, strict: strict / N, released: released / N, lucky };
}

export function rlvrTensor(view: RlvrView = rlvrDefaultView): Tensor {
  const { cols, rows } = PROBLEMS;
  const t = blank(cols, rows);
  const k = kOf(view.log2k);
  const list = problems();
  const tags: string[] = new Array(N);
  // list[0] is easiest; place it at the FRONT row (rows - 1).
  for (let idx = 0; idx < N; idx++) {
    const rowFromFront = Math.floor(idx / cols);
    const r = rows - 1 - rowFromFront;
    const c = idx % cols;
    const i = r * cols + c;
    const pr = list[idx];
    const s = passAtK(pr.p, k);
    const rel = passAtK(pr.p + pr.q, k);
    const shown = view.grader === "strict" ? s : rel;
    t.h[i] = 0.03 + 0.97 * shown;
    const luckyOnly = view.grader === "released" && rel >= 0.5 && s < 0.5;
    t.dye[i] = s >= 0.5 ? DYE_CHECK : luckyOnly ? DYE_MODEL : 0;
    const kLabel = Math.round(k);
    tags[i] =
      `problem ${pr.id + 1} · strict pass@${kLabel} ${s.toFixed(2)} · released ${rel.toFixed(2)}` +
      (luckyOnly ? " · counted only because some sample ended on the right number" : s >= 0.5 ? " · actually solved" : "") +
      " · toy";
  }
  t.describe = (i) => tags[i];
  return t;
}
