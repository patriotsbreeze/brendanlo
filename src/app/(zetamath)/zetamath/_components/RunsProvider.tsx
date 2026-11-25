"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { unsynced } from "../_lib/browser";
import { oldestFirst, parseRun, type Run, type Solved } from "../_lib/runs";

/* One copy of the runs for all three tabs. The layout that mounts this stays
 * put while the tabs change, so a finished run survives a look at the tricks.
 *
 * Saving is queue-first: a run goes into this browser's storage, then to the
 * server, and leaves the queue only once the server has it. */

export type Result = { run: Run; solved: Solved[] };

type Storage = "redis" | "file" | "none";
type Sync = "idle" | "saving" | "offline" | "no-storage";

type RunsContext = {
  status: "loading" | "ready" | "error";
  owner: boolean;
  runs: readonly Run[];
  sync: Sync;
  waiting: number;
  result: Result | null;
  finish: (result: Result) => void;
  clearResult: () => void;
  setExcluded: (id: string, excluded: boolean) => void;
  signIn: (password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const Context = createContext<RunsContext | null>(null);

export function useRuns(): RunsContext {
  const value = useContext(Context);
  if (!value) throw new Error("useRuns needs RunsProvider");
  return value;
}

const RUNS_API = "/zetamath/api/runs";
const SESSION_API = "/zetamath/api/session";

export function RunsProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<RunsContext["status"]>("loading");
  const [owner, setOwner] = useState(false);
  const [byId, setById] = useState<Record<string, Run>>({});
  const [sync, setSync] = useState<Sync>("idle");
  const [waiting, setWaiting] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const flushing = useRef(false);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      for (;;) {
        const batch = unsynced.all().slice(0, 100);
        setWaiting(batch.length);
        if (batch.length === 0) {
          setSync("idle");
          return;
        }
        setSync("saving");
        const res = await fetch(RUNS_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runs: batch }),
        });
        if (!res.ok) {
          if (res.status === 401) setOwner(false);
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          setSync(body?.error === "no storage connected" ? "no-storage" : "offline");
          return;
        }
        unsynced.confirm(batch);
      }
    } catch {
      setSync("offline");
    } finally {
      flushing.current = false;
    }
  }, []);

  const load = useCallback(async () => {
    const queued = unsynced.all();
    setWaiting(queued.length);
    const local = Object.fromEntries(queued.map((r) => [r.id, r]));
    try {
      const res = await fetch(RUNS_API, { cache: "no-store" });
      const body = (await res.json()) as { owner?: boolean; storage?: Storage; runs?: unknown[] };
      const list = (body.runs ?? []).map(parseRun).filter((r) => r !== null);
      setOwner(Boolean(body.owner));
      // The queue wins: it holds whatever the server has not heard about yet.
      setById({ ...Object.fromEntries(list.map((r) => [r.id, r])), ...local });
      setStatus(res.ok ? "ready" : "error");
      if (body.owner) void flush();
    } catch {
      setById((now) => ({ ...now, ...local }));
      setStatus("error");
    }
  }, [flush]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!owner) return;
    const retry = () => {
      if (document.visibilityState === "visible" && unsynced.all().length > 0) void flush();
    };
    window.addEventListener("online", retry);
    document.addEventListener("visibilitychange", retry);
    return () => {
      window.removeEventListener("online", retry);
      document.removeEventListener("visibilitychange", retry);
    };
  }, [owner, flush]);

  const save = useCallback(
    (run: Run) => {
      setById((now) => ({ ...now, [run.id]: run }));
      unsynced.put(run);
      setWaiting(unsynced.all().length);
      void flush();
    },
    [flush],
  );

  const value = useMemo<RunsContext>(
    () => ({
      status,
      owner,
      runs: Object.values(byId).sort(oldestFirst),
      sync,
      waiting,
      result,
      finish(next) {
        setResult(next);
        if (owner) save(next.run);
      },
      clearResult: () => setResult(null),
      setExcluded(id, excluded) {
        const run = byId[id];
        if (owner && run && run.excluded !== excluded) save({ ...run, excluded });
      },
      async signIn(password) {
        try {
          const res = await fetch(SESSION_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
          });
          if (!res.ok) return res.status === 401 ? "that's not it." : "couldn't log in. try again.";
        } catch {
          return "couldn't reach the server.";
        }
        setOwner(true);
        // Logging in from the results screen records the run on it.
        if (result && !byId[result.run.id]) unsynced.put(result.run);
        await load();
        return null;
      },
      async signOut() {
        await fetch(SESSION_API, { method: "DELETE" }).catch(() => null);
        setOwner(false);
      },
    }),
    [status, owner, byId, sync, waiting, result, save, load],
  );

  return <Context value={value}>{children}</Context>;
}
