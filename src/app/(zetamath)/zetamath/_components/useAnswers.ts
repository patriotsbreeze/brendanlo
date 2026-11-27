import { useEffect, useMemo, useSyncExternalStore } from "react";
import { FIRST_DAY, LAST_DAY, parseAnswers, type Run } from "../_lib/runs";
import type { Period } from "../_lib/stats";

/* The answers of the runs the stats tab shows. They do not come with the runs,
 * which every tab loads, because they make a run some six times bigger: this
 * asks for the days shown, and keeps what comes back while the page is open.
 *
 * Answers are written once, so what is kept stays true. What it can lack is a
 * run saved after it was asked for. One played in this browser carries its own,
 * and any other comes in with a new load of the runs, which starts afresh. */

const API = "/zetamath/api/answers";

type Entry = { prefix: string; from: string; to: string } & (
  | { state: "loading" | "error" }
  | { state: "ready"; answers: Readonly<Record<string, unknown>> }
);

/** By account and load, then days. */
const cache = new Map<string, Entry>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

function put(key: string, entry: Entry) {
  cache.set(key, entry);
  for (const l of listeners) l();
}

/** What was fetched for these days, or for days around them. */
function find(prefix: string, from: string, to: string): Entry | undefined {
  for (const e of cache.values()) {
    if (e.state === "ready" && e.prefix === prefix && e.from <= from && e.to >= to) return e;
  }
  return cache.get(`${prefix} ${from} ${to}`);
}

async function ask(prefix: string, from: string, to: string) {
  // Another account's, or from before the runs last loaded: no use now.
  for (const [key, e] of cache) if (e.prefix !== prefix) cache.delete(key);
  const key = `${prefix} ${from} ${to}`;
  put(key, { prefix, from, to, state: "loading" });
  try {
    const res = await fetch(`${API}?${new URLSearchParams({ from, to })}`, { cache: "no-store" });
    const body: unknown = await res.json();
    if (!res.ok || typeof body !== "object" || body === null || Array.isArray(body) || "error" in body) {
      throw new Error("no answers");
    }
    put(key, { prefix, from, to, state: "ready", answers: body as Record<string, unknown> });
  } catch {
    put(key, { prefix, from, to, state: "error" });
  }
}

const clamp = (day: string) => (day < FIRST_DAY ? FIRST_DAY : day > LAST_DAY ? LAST_DAY : day);

export type Answered = {
  state: "loading" | "error" | "ready";
  /** The runs given, each with its answers once they are in, if it has any. */
  runs: readonly Run[];
  retry: () => void;
};

/** `runs`, the ones `who` played in `period`, with their answers. `loads` is
 * useRuns()'s. */
export function useAnswers(
  who: string | null,
  loads: number,
  period: Period | null,
  runs: readonly Run[],
): Answered {
  const prefix = `${who} ${loads}`;
  // "all" runs from year 0 to 9999, which the database will not take as dates.
  const from = clamp(period?.from ?? FIRST_DAY);
  const to = clamp(period?.to ?? LAST_DAY);
  const needed = who !== null && period !== null && runs.some((r) => !r.answers);
  const entry = useSyncExternalStore(
    subscribe,
    () => (needed ? find(prefix, from, to) : undefined),
    () => undefined,
  );

  useEffect(() => {
    // The cache, not `entry`: an effect run twice over must not ask twice.
    if (needed && !find(prefix, from, to)) void ask(prefix, from, to);
  }, [needed, entry, prefix, from, to]);

  const answered = useMemo(() => {
    if (entry?.state !== "ready") return runs;
    const out: Run[] = [];
    for (const r of runs) {
      const raw = r.answers || !Object.hasOwn(entry.answers, r.id) ? null : entry.answers[r.id];
      if (raw === null) {
        out.push(r);
        continue;
      }
      // Not what the game could have asked, so written some other way than
      // through the site: the run hides itself, as parseRun() would have it.
      const answers = parseAnswers(raw, r.score);
      if (answers) out.push({ ...r, answers });
    }
    return out;
  }, [runs, entry]);

  return {
    state: needed ? (entry?.state ?? "loading") : "ready",
    runs: answered,
    retry: () => void ask(prefix, from, to),
  };
}
