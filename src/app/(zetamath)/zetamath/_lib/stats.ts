/* Everything the stats tab shows, added up from runs: which period, and in it
 * how fast and how cleanly each operation, each kind of problem and each single
 * problem went. Pure, so scripts/verify-stats.mts can check the sums. */

import { kindOrder, kindsOf, type Kind } from "./kinds.ts";
import { OPS, type Op, type Problem } from "./problems.ts";
import { DAY_MS, dayToMs, problemOf, type Run } from "./runs.ts";
import { trickFor } from "./tricks.ts";

// ------------------------------------------------------------------ periods

export type Span = "day" | "week" | "month" | "all";
export const SPANS: readonly Span[] = ["day", "week", "month", "all"];

/** Day keys, both ends included. Day keys sort as text, so comparing is cheap. */
export type Period = { span: Span; from: string; to: string };

const ALL: Period = { span: "all", from: "0000-01-01", to: "9999-12-31" };

const keyOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The day, the Monday-to-Sunday week, or the calendar month `day` is in. */
export function periodOf(span: Span, day: string): Period {
  const ms = dayToMs(day);
  if (span === "day") return { span, from: day, to: day };
  if (span === "week") {
    const monday = ms - ((new Date(ms).getUTCDay() + 6) % 7) * DAY_MS;
    return { span, from: keyOf(monday), to: keyOf(monday + 6 * DAY_MS) };
  }
  if (span === "month") {
    const d = new Date(ms);
    const [y, m] = [d.getUTCFullYear(), d.getUTCMonth()];
    return { span, from: keyOf(Date.UTC(y, m, 1)), to: keyOf(Date.UTC(y, m + 1, 0)) };
  }
  return ALL;
}

export const within = (day: string, p: Period) => day >= p.from && day <= p.to;

/** The period just before or after this one. "all" has none. */
export function shift(p: Period, by: number): Period | null {
  if (p.span === "all") return null;
  const start = dayToMs(p.from);
  if (p.span === "month") {
    const d = new Date(start);
    return periodOf("month", keyOf(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + by, 1)));
  }
  return periodOf(p.span, keyOf(start + by * (p.span === "week" ? 7 : 1) * DAY_MS));
}

/** The nearest period that way with a run in it, given every day played,
 * sorted. Empty days and weeks are skipped: there is nothing to see in them. */
export function stepTo(p: Period, by: -1 | 1, played: readonly string[]): Period | null {
  if (p.span === "all") return null;
  const day = by < 0 ? played.findLast((d) => d < p.from) : played.find((d) => d > p.to);
  return day === undefined ? null : periodOf(p.span, day);
}

/** Every day of a period, oldest first. */
export function daysOf(p: Period): string[] {
  const out: string[] = [];
  for (let ms = dayToMs(p.from); ms <= dayToMs(p.to); ms += DAY_MS) out.push(keyOf(ms));
  return out;
}

// ------------------------------------------------------------------ tallies

/** Answers added up. `n` and `ms` count every answer. Misses are known only for
 * answers that were kept one by one, so `missed` is out of `checked`. */
export type Tally = { n: number; ms: number; missed: number; checked: number };

const zero = (): Tally => ({ n: 0, ms: 0, missed: 0, checked: 0 });

function add(into: Tally, t: Tally) {
  into.n += t.n;
  into.ms += t.ms;
  into.missed += t.missed;
  into.checked += t.checked;
}

/** Mean ms an answer, or null with nothing to go on. */
export const meanMs = (t: Tally) => (t.n ? t.ms / t.n : null);

/** Share of answers with a wrong digit on the way, or null if unknown. */
export const missRate = (t: Tally) => (t.checked ? t.missed / t.checked : null);

export type ProblemTally = Tally & {
  key: string;
  problem: Problem;
  best: number;
  worst: number;
  /** ms, the most recent time it came up. */
  last: number;
  lastAt: number;
};

export type KindTally = Tally & {
  kind: Kind;
  /** ms, its single slowest answer. */
  worst: number;
  /** The trick that fits at least half its answers, if one does. */
  trick?: string;
};

export type Stats = {
  runs: number;
  days: number;
  /** Runs with every answer kept. Only these feed the kinds and problems. */
  detailed: number;
  /** Per operation, from every run's totals. Misses from those with answers. */
  ops: Partial<Record<Op, Tally>>;
  total: Tally;
  /** Per operation, from kept answers alone: what kinds and problems are
   * compared with, so the comparison is between the same answers. */
  answered: Partial<Record<Op, Tally>>;
  kinds: KindTally[];
  problems: ProblemTally[];
};

export const problemKey = (p: Problem) => `${p.op} ${p.a} ${p.b}`;

export function tally(runs: readonly Run[]): Stats {
  const ops: Partial<Record<Op, Tally>> = {};
  const answered: Partial<Record<Op, Tally>> = {};
  const problems = new Map<string, ProblemTally>();
  const days = new Set<string>();
  let detailed = 0;

  for (const run of runs) {
    days.add(run.day);
    for (const op of OPS) {
      const pair = run.ops[op];
      if (!pair || pair[0] === 0) continue;
      const t = (ops[op] ??= zero());
      t.n += pair[0];
      t.ms += pair[1];
    }
    if (!run.answers) continue;
    detailed++;
    for (const answer of run.answers) {
      const problem = problemOf(answer);
      const [, , , ms, misses] = answer;
      const missed = misses > 0 ? 1 : 0;
      const one: Tally = { n: 1, ms, missed, checked: 1 };
      add((answered[problem.op] ??= zero()), one);
      const t = (ops[problem.op] ??= zero());
      t.missed += missed;
      t.checked += 1;

      const key = problemKey(problem);
      const seen = problems.get(key);
      if (!seen) {
        problems.set(key, { ...one, key, problem, best: ms, worst: ms, last: ms, lastAt: run.at });
        continue;
      }
      add(seen, one);
      seen.best = Math.min(seen.best, ms);
      seen.worst = Math.max(seen.worst, ms);
      if (run.at >= seen.lastAt) {
        seen.last = ms;
        seen.lastAt = run.at;
      }
    }
  }

  // Kinds and tricks once per problem, not once per answer.
  const kinds = new Map<Kind, KindTally & { tricks: Map<string, number> }>();
  for (const p of problems.values()) {
    const trick = trickFor(p.problem)?.id;
    for (const kind of kindsOf(p.problem)) {
      let k = kinds.get(kind);
      if (!k) kinds.set(kind, (k = { ...zero(), kind, worst: 0, tricks: new Map() }));
      add(k, p);
      k.worst = Math.max(k.worst, p.worst);
      if (trick) k.tricks.set(trick, (k.tricks.get(trick) ?? 0) + p.n);
    }
  }

  const total = zero();
  for (const t of Object.values(ops)) add(total, t);

  return {
    runs: runs.length,
    days: days.size,
    detailed,
    ops,
    total,
    answered,
    kinds: [...kinds.values()]
      .map(({ tricks, ...k }) => {
        const [top] = [...tricks.entries()].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1));
        // A mixed bag has no one trick: "times-table facts" are many tables.
        return top && top[1] >= k.n / 2 ? { ...k, trick: top[0] } : k;
      })
      .sort((x, y) => kindOrder(x.kind, y.kind)),
    problems: [...problems.values()],
  };
}

// --------------------------------------------------------------- weak spots

export type Spot = {
  kind: KindTally;
  /** ms an answer, as played. */
  mean: number;
  /** ms an answer for the whole operation, over the same kept answers. */
  base: number;
  /** How much slower than the operation it is: see steadyRatio(). */
  ratio: number;
  /** ms it adds to an average run, over going at the operation's pace. */
  cost: number;
};

/** As if this many answers at the operation's own pace were already in. */
const PRIOR = 8;
/** Fewer answers than this and a kind is not called slow or fast at all. */
export const MIN_ANSWERS = 4;
/** Held back, at least this much slower than its operation is "slower". */
export const SLOWER = 1.08;

/** Fewer kept answers than this in a period and any ranking is mostly luck. */
export const ENOUGH = 40;

const heldBack = (n: number, ms: number, base: number) => (ms + PRIOR * base) / (n + PRIOR) / base;

/** How many times slower than `base` (ms an answer) a kind is, counted as if
 * PRIOR answers at `base` were already in, and without its slowest answer if
 * that says less: one answer, however slow, cannot make a kind look slow. */
export function steadyRatio(k: KindTally, base: number): number {
  return Math.min(heldBack(k.n, k.ms, base), heldBack(k.n - 1, k.ms - k.worst, base));
}

/** Slower than the rest of its operation, with the answers to say so. */
export const clearlySlower = (k: KindTally, base: number) =>
  k.n >= MIN_ANSWERS && steadyRatio(k, base) >= SLOWER;

/** Kept answers in the period, every operation together. */
export const keptAnswers = (stats: Stats) =>
  Object.values(stats.answered).reduce((n, t) => n + t.n, 0);

/** Kinds clearly slower than the rest of their operation, slowest first. None
 * while the period has too few answers to tell. */
export function weakSpots(stats: Stats, limit = 6): Spot[] {
  if (keptAnswers(stats) < ENOUGH) return [];
  const out: Spot[] = [];
  for (const k of stats.kinds) {
    const op = stats.answered[k.kind.op];
    if (!op) continue;
    const base = op.ms / op.n;
    if (!clearlySlower(k, base)) continue;
    const ratio = steadyRatio(k, base);
    out.push({ kind: k, mean: k.ms / k.n, base, ratio, cost: (k.ms - k.n * base) / stats.detailed });
  }
  return out.sort((x, y) => y.ratio - x.ratio || kindOrder(x.kind.kind, y.kind.kind)).slice(0, limit);
}

// --------------------------------------------------------------------- maps

/** The two numbers the game picked for each operation. Subtraction and
 * division are addition and multiplication run backwards, so they are mapped
 * the same way round: what was taken away (or divided by), against the answer. */
export const AXES: Record<Op, readonly [row: (p: Problem) => number, col: (p: Problem) => number]> = {
  add: [(p) => p.a, (p) => p.b],
  sub: [(p) => p.b, (p) => p.answer],
  mul: [(p) => p.a, (p) => p.b],
  div: [(p) => p.b, (p) => p.answer],
};

export type Bucket = { from: number; to: number };

const MAX_BUCKETS = 12;
const STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10_000];

/** Round, equal slices covering lo to hi, at most MAX_BUCKETS of them. The
 * ends are trimmed to what was seen, so the first reads "2–9", not "0–9". */
export function buckets(lo: number, hi: number): Bucket[] {
  const fits = (s: number) => Math.floor(hi / s) - Math.floor(lo / s) + 1 <= MAX_BUCKETS;
  const step = hi - lo < 13 ? 1 : (STEPS.find(fits) ?? 10 ** Math.ceil(Math.log10(hi - lo + 1)));
  const out: Bucket[] = [];
  for (let start = Math.floor(lo / step) * step; start <= hi; start += step) {
    out.push({ from: Math.max(lo, start), to: Math.min(hi, start + step - 1) });
  }
  return out;
}

export type Cell = Tally & { problems: ProblemTally[] };

export type Grid = {
  op: Op;
  rows: Bucket[];
  cols: Bucket[];
  /** [row][col], null where nothing came up. */
  cells: (Cell | null)[][];
};

export function grid(stats: Stats, op: Op): Grid | null {
  const list = stats.problems.filter((p) => p.problem.op === op);
  if (list.length === 0) return null;
  const [row, col] = AXES[op];
  const rs = list.map((p) => row(p.problem));
  const cs = list.map((p) => col(p.problem));
  const rows = buckets(Math.min(...rs), Math.max(...rs));
  const cols = buckets(Math.min(...cs), Math.max(...cs));
  const find = (bs: Bucket[], v: number) => bs.findIndex((b) => v >= b.from && v <= b.to);
  const cells: (Cell | null)[][] = rows.map(() => cols.map(() => null));
  for (const p of list) {
    const [i, j] = [find(rows, row(p.problem)), find(cols, col(p.problem))];
    const cell = (cells[i][j] ??= { ...zero(), problems: [] });
    add(cell, p);
    cell.problems.push(p);
  }
  return { op, rows, cols, cells };
}

// -------------------------------------------------------------------- trend

export type Point = {
  /** First day it covers, or the run's id for a single day. */
  key: string;
  from: string;
  to: string;
  runs: Run[];
};

/** Slices of a period to draw a line through: each run of a day, each day of a
 * week or a month, and for all time each day, week or month, whichever leaves
 * a readable number. Slices with no runs are kept, as gaps. */
export function trend(runs: readonly Run[], p: Period): Point[] {
  if (p.span === "day") return runs.map((r) => ({ key: r.id, from: r.day, to: r.day, runs: [r] }));
  let range = p;
  let size: Span = "day";
  if (p.span === "all") {
    if (runs.length === 0) return [];
    const days = runs.map((r) => r.day).sort();
    range = { span: "all", from: days[0], to: days[days.length - 1] };
    const length = (dayToMs(range.to) - dayToMs(range.from)) / DAY_MS + 1;
    size = length <= 62 ? "day" : length <= 7 * 60 ? "week" : "month";
  }
  const out: Point[] = [];
  for (let slice: Period | null = periodOf(size, range.from); slice && slice.from <= range.to; slice = shift(slice, 1)) {
    const s = slice;
    out.push({ key: s.from, from: s.from, to: s.to, runs: runs.filter((r) => within(r.day, s)) });
  }
  return out;
}

/** Per operation, from run totals alone: enough for a trend line. */
export function opTally(runs: readonly Run[]): Partial<Record<Op, Tally>> {
  const out: Partial<Record<Op, Tally>> = {};
  for (const r of runs) {
    for (const op of OPS) {
      const pair = r.ops[op];
      if (!pair || pair[0] === 0) continue;
      const t = (out[op] ??= zero());
      t.n += pair[0];
      t.ms += pair[1];
    }
  }
  return out;
}
