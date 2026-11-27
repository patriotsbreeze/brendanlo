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
/** When each account's runs were last asked for again because the server said
 * its login was gone. A reload starts a new load, so this goes by the clock:
 * a server that kept saying it must not have the runs asked for over and over. */
const reloadedAt = new Map<string, number>();
const RELOAD_GAP_MS = 60_000;
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

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

async function ask(who: string, prefix: string, from: string, to: string, reload: () => void) {
  // Another account's, or from before the runs last loaded: no use now.
  for (const [key, e] of cache) if (e.prefix !== prefix) cache.delete(key);
  const key = `${prefix} ${from} ${to}`;
  put(key, { prefix, from, to, state: "loading" });
  let body: unknown = null;
  let ok = false;
  try {
    const res = await fetch(`${API}?${new URLSearchParams({ from, to })}`, { cache: "no-store" });
    ok = res.ok;
    body = await res.json();
  } catch {
    // Offline, or not JSON: an error like any other, below.
  }
  if (ok && isRecord(body) && !("error" in body)) {
    put(key, { prefix, from, to, state: "ready", answers: body });
    return;
  }
  put(key, { prefix, from, to, state: "error" });
  // Logged out since the runs loaded, by a password changed somewhere else or
  // a login that ran out. Asking again would only hear it again, so load the
  // runs afresh, which shows the login form, as saving a run would.
  if (isRecord(body) && body.error === "not_logged_in") {
    const last = reloadedAt.get(who);
    if (last === undefined || Date.now() - last > RELOAD_GAP_MS) {
      reloadedAt.set(who, Date.now());
      reload();
    }
  }
}

const clamp = (day: string) => (day < FIRST_DAY ? FIRST_DAY : day > LAST_DAY ? LAST_DAY : day);

export type Answered = {
  state: "loading" | "error" | "ready";
  /** The runs given, each with its answers once they are in, if it has any. */
  runs: readonly Run[];
  retry: () => void;
};

/** `runs`, the ones `who` played in `period`, with their answers. `loads` and
 * `reload` are useRuns()'s. */
export function useAnswers(
  who: string | null,
  loads: number,
  reload: () => void,
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
    if (needed && who !== null && !find(prefix, from, to)) void ask(who, prefix, from, to, reload);
  }, [needed, who, entry, prefix, from, to, reload]);

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
      // through the site. The run still counts, as it does on the other tabs,
      // but its answers do not: it is treated as one from before they were kept.
      const answers = parseAnswers(raw, r.score);
      out.push(answers ? { ...r, answers } : r);
    }
    return out;
  }, [runs, entry]);

  return {
    state: needed ? (entry?.state ?? "loading") : "ready",
    runs: answered,
    retry: () => {
      if (who !== null) void ask(who, prefix, from, to, reload);
    },
  };
}
