"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { parseAccount, refusalWords, type Account } from "../_lib/accounts";
import { accountHint, unsynced } from "../_lib/browser";
import { oldestFirst, parseRun, type Run, type Solved } from "../_lib/runs";

/* Who is logged in, and one copy of the runs for every tab. The layout that
 * mounts this stays put while the tabs change, so a finished run survives a look
 * at the tricks.
 *
 * Saving is queue-first: a run goes into this browser's storage, then to the
 * server, and leaves the queue only once the server has it. */

export type Result = {
  run: Run;
  solved: Solved[];
  /** The account it went to, whoever is logged in now. */
  keptBy?: string;
};

type Sync = "idle" | "saving" | "offline" | "full";

type RunsContext = {
  status: "loading" | "ready" | "error";
  account: Account | null;
  /** This account's. Empty when nobody is logged in. */
  runs: readonly Run[];
  /** Goes up each time the runs come from the server. Those come without their
   * answers, so answers fetched before may be missing some of them. */
  loads: number;
  /** Asks the server for the runs again: after it said this browser's login is
   * gone, say. */
  reload: () => void;
  sync: Sync;
  /** Runs this browser has that the server does not, by username. */
  waiting: Readonly<Record<string, number>>;
  result: Result | null;
  finish: (result: Result) => void;
  clearResult: () => void;
  record: (run: Run) => void;
  setExcluded: (id: string, excluded: boolean) => void;
  /** These return what went wrong, in words, or null. */
  enter: (how: "log in" | "sign up", username: string, password: string, run?: Run) => Promise<string | null>;
  logOut: () => Promise<string | null>;
  changePassword: (current: string, next: string) => Promise<string | null>;
  deleteAccount: (password: string) => Promise<string | null>;
};

const Context = createContext<RunsContext | null>(null);

export function useRuns(): RunsContext {
  const value = useContext(Context);
  if (!value) throw new Error("useRuns needs RunsProvider");
  return value;
}

const RUNS_API = "/zetamath/api/runs";
const SESSION_API = "/zetamath/api/session";
const ACCOUNT_API = "/zetamath/api/account";

type Reply = { error?: string; [key: string]: unknown };

async function ask(url: string, method: string, body?: unknown): Promise<Reply> {
  try {
    const res = await fetch(url, {
      method,
      cache: "no-store",
      ...(body === undefined
        ? {}
        : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    });
    const reply = (await res.json()) as Reply;
    return res.ok ? reply : { error: reply.error ?? "unreachable" };
  } catch {
    return { error: "unreachable" };
  }
}

const parseRuns = (v: unknown): Run[] =>
  (Array.isArray(v) ? v : []).map(parseRun).filter((r) => r !== null);

const byId = (runs: readonly Run[]) => Object.fromEntries(runs.map((r) => [r.id, r]));

export function RunsProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<RunsContext["status"]>("loading");
  const [account, setAccount] = useState<Account | null>(null);
  const [mine, setMine] = useState<Record<string, Run>>({});
  const [loads, setLoads] = useState(0);
  const [sync, setSync] = useState<Sync>("idle");
  const [waiting, setWaiting] = useState<Record<string, number>>({});
  const [result, setResult] = useState<Result | null>(null);

  /** Whose runs `mine` holds, for code that outlives a render. */
  const who = useRef<string | null>(null);
  const flushing = useRef(false);
  /** Counts loads, so that only the newest one's answer is used. */
  const asked = useRef(0);
  /** Saved while the current load is out, so its answer may predate them. */
  const confirmed = useRef<Record<string, Run>>({});
  const reload = useRef<() => Promise<void>>(async () => {});

  const become = useCallback((next: Account | null) => {
    who.current = next?.username ?? null;
    setAccount(next);
    accountHint.set(next);
  }, []);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      for (;;) {
        setWaiting(unsynced.counts());
        // Read each time round: someone else may have logged in meanwhile.
        const username = who.current;
        const batch = username === null ? [] : unsynced.of(username).slice(0, 100);
        if (username === null || batch.length === 0) {
          setSync("idle");
          return;
        }
        setSync("saving");
        const reply = await ask(RUNS_API, "POST", { account: username, runs: batch });
        if (reply.error && who.current !== username) continue;
        if (reply.error) {
          setSync(reply.error === "full" ? "full" : "offline");
          // Logged out, or in as someone else, since this tab last looked.
          if (reply.error === "not_logged_in" || reply.error === "other_account") void reload.current();
          return;
        }
        unsynced.confirm(batch);
        if (who.current !== username) continue;
        for (const r of batch) confirmed.current[r.id] = r;
        // Typed in by hand, and now hidden behind the real runs.
        const gone = new Set(Array.isArray(reply.replaced) ? reply.replaced : []);
        for (const id of gone) delete confirmed.current[id as string];
        if (gone.size > 0) {
          setMine((now) => byId(Object.values(now).filter((r) => !gone.has(r.id))));
        }
      }
    } finally {
      flushing.current = false;
    }
  }, []);

  const load = useCallback(async () => {
    const turn = ++asked.current;
    confirmed.current = {};
    setWaiting(unsynced.counts());
    const reply = await ask(RUNS_API, "GET");
    if (turn !== asked.current) return;
    if (reply.error) {
      // Could not ask, so go by last time: a run finished now still queues.
      const last = reply.error === "no_database" ? null : accountHint.get();
      if (who.current !== (last?.username ?? null)) setMine({});
      if (last) setMine((now) => ({ ...now, ...byId(unsynced.of(last.username)) }));
      become(last);
      setSync("offline");
      setStatus(reply.error === "no_database" ? "ready" : "error");
    } else {
      const next = parseAccount(reply.account);
      become(next);
      // Newest word last: the queue, read now rather than before the request,
      // holds whatever the server has not heard about yet.
      setMine(
        next
          ? byId([
              ...parseRuns(reply.runs),
              ...Object.values(confirmed.current),
              ...unsynced.of(next.username),
            ])
          : {},
      );
      setLoads((n) => n + 1);
      setStatus("ready");
      void flush();
    }
  }, [become, flush]);

  useEffect(() => {
    reload.current = load;
    void load();
    return accountHint.onChange(() => void load());
  }, [load]);

  useEffect(() => {
    if (!account && status !== "error") return;
    const retry = () => {
      if (document.visibilityState !== "visible") return;
      if (status === "error") void load();
      else if (account && unsynced.of(account.username).length > 0) void flush();
    };
    window.addEventListener("online", retry);
    document.addEventListener("visibilitychange", retry);
    return () => {
      window.removeEventListener("online", retry);
      document.removeEventListener("visibilitychange", retry);
    };
  }, [account, status, load, flush]);

  const save = useCallback(
    (run: Run, username: string) => {
      setMine((now) => ({ ...now, [run.id]: run }));
      unsynced.put(run, username);
      setResult((now) => (now?.run.id === run.id ? { ...now, keptBy: username } : now));
      setWaiting(unsynced.counts());
      void flush();
    },
    [flush],
  );

  const value = useMemo<RunsContext>(
    () => ({
      status,
      account,
      runs: Object.values(mine).sort(oldestFirst),
      loads,
      reload: () => void load(),
      sync,
      waiting,
      result,
      finish(next) {
        setResult(next);
        const username = account?.username ?? (status === "loading" ? accountHint.get()?.username : null);
        if (username) save(next.run, username);
      },
      clearResult: () => setResult(null),
      record(run) {
        if (account) save(run, account.username);
      },
      setExcluded(id, excluded) {
        const run = mine[id];
        if (account && run && run.excluded !== excluded) save({ ...run, excluded }, account.username);
      },
      async enter(how, username, password, run) {
        const reply = await ask(SESSION_API, "POST", { username, password, create: how === "sign up" });
        const next = parseAccount(reply.account);
        if (reply.error || !next) return refusalWords(reply.error);
        accountHint.set(next);
        if (run) {
          unsynced.put(run, next.username);
          setResult((now) => (now?.run.id === run.id ? { ...now, keptBy: next.username } : now));
        }
        await load();
        return null;
      },
      async logOut() {
        const reply = await ask(SESSION_API, "DELETE");
        // The cookie is still good, so still logged in.
        if (reply.error) return refusalWords(reply.error);
        accountHint.set(null);
        await load();
        return null;
      },
      async changePassword(current, next) {
        const reply = await ask(ACCOUNT_API, "POST", { account: account?.username, current, next });
        if (reply.error === "wrong") return "that's not your current password.";
        return reply.error ? refusalWords(reply.error) : null;
      },
      async deleteAccount(password) {
        const reply = await ask(ACCOUNT_API, "DELETE", { account: account?.username, password });
        if (reply.error === "wrong") return "that's not your password.";
        if (reply.error) return refusalWords(reply.error);
        if (account) unsynced.forget(account.username);
        accountHint.set(null);
        await load();
        return null;
      },
    }),
    [status, account, mine, loads, sync, waiting, result, save, load],
  );

  return <Context value={value}>{children}</Context>;
}
