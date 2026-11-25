/* A finished run, as stored and as charted. Shared by the client and the API. */

import { OPS, SETTINGS_KEY, type Op, type Problem } from "./problems.ts";

export type Run = {
  id: string;
  /** Epoch ms at the buzzer. */
  at: number;
  /** YYYY-MM-DD on the clock of whoever played. Stored rather than derived, so
   * a visitor in another time zone sees the same days. */
  day: string;
  /** Their getTimezoneOffset(), so the time shown belongs to that day. */
  offset?: number;
  score: number;
  seconds: number;
  /** settingsKey() of the settings it was played on. */
  settings: string;
  /** Per operation: [problems solved, total ms spent on them]. */
  ops: Partial<Record<Op, [count: number, ms: number]>>;
  excluded: boolean;
};

export type Solved = { problem: Problem; ms: number; /** ms into the run */ at: number };

export function dayKey(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Day keys are calendar dates, so do their arithmetic in UTC: no DST hours. */
export const dayToMs = (day: string) => Date.parse(`${day}T00:00:00Z`);
export const DAY_MS = 86_400_000;

export function opTotals(solved: readonly Solved[]): Run["ops"] {
  const out: Run["ops"] = {};
  for (const s of solved) {
    const [n, ms] = out[s.problem.op] ?? [0, 0];
    out[s.problem.op] = [n + 1, ms + Math.round(s.ms)];
  }
  return out;
}

const int = (v: unknown, lo: number, hi: number): v is number =>
  Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;

const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;

/** Trust boundary: rebuild a run field by field, or reject it. */
export function parseRun(v: unknown): Run | null {
  if (typeof v !== "object" || v === null) return null;
  const r = v as Record<string, unknown>;
  if (typeof r.id !== "string" || !UUID.test(r.id)) return null;
  if (!int(r.at, 1_577_836_800_000, 4_102_444_800_000)) return null;
  if (typeof r.day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(r.day)) return null;
  // No 31st of February.
  if (dayToMs(r.day) % DAY_MS !== 0 || !new Date(dayToMs(r.day)).toISOString().startsWith(r.day)) return null;
  if (!int(r.score, 0, 5000) || !int(r.seconds, 1, 3600)) return null;
  if (typeof r.settings !== "string" || !SETTINGS_KEY.test(r.settings)) return null;
  if (r.offset !== undefined && !int(r.offset, -900, 900)) return null;
  if (typeof r.excluded !== "boolean") return null;
  const ops: Run["ops"] = {};
  const raw = (typeof r.ops === "object" && r.ops !== null ? r.ops : {}) as Record<string, unknown>;
  for (const op of OPS) {
    const pair = raw[op];
    if (pair === undefined) continue;
    if (!Array.isArray(pair) || !int(pair[0], 0, 5000) || !int(pair[1], 0, 3_600_000)) return null;
    ops[op] = [pair[0], pair[1]];
  }
  return {
    id: r.id,
    at: r.at,
    day: r.day,
    ...(r.offset === undefined ? {} : { offset: r.offset }),
    score: r.score,
    seconds: r.seconds,
    settings: r.settings,
    ops,
    excluded: r.excluded,
  };
}

export type Day = { day: string; runs: Run[]; best: Run };

/** Runs grouped by day, oldest first. The earliest top score wins a tie. */
export function byDay(runs: readonly Run[]): Day[] {
  const days = new Map<string, Run[]>();
  for (const r of runs) {
    const list = days.get(r.day);
    if (list) list.push(r);
    else days.set(r.day, [r]);
  }
  return [...days.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, list]) => ({
      day,
      runs: list,
      best: list.reduce((top, r) => (r.score > top.score ? r : top)),
    }));
}

/** Mean of each run and up to `window - 1` before it. */
export function trailingMean(scores: readonly number[], window: number): number[] {
  return scores.map((_, i) => {
    const slice = scores.slice(Math.max(0, i - window + 1), i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

export const oldestFirst = (a: Run, b: Run) => a.at - b.at || (a.id < b.id ? -1 : 1);
