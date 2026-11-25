import { parseSettings, STANDARD, type Settings } from "./problems";
import { parseRun, type Run } from "./runs";

/* What this browser remembers: the last settings, and runs the server has not
 * confirmed yet. Every access is guarded, because storage can be blocked. */

function read(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private window or full disk: the in-memory copy still works.
  }
}

// ------------------------------------------------------------------ settings

const SETTINGS = "zetamath.settings";
let settings: Settings | undefined;
const listeners = new Set<() => void>();

/** A useSyncExternalStore source, so the server can render the defaults and the
 * browser can swap in its own without a hydration mismatch. */
export const settingsStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: () => (settings ??= parseSettings(read(SETTINGS)) ?? STANDARD),
  getServer: () => STANDARD,
  set(next: Settings) {
    settings = next;
    if (parseSettings(next)) write(SETTINGS, next);
    for (const l of listeners) l();
  },
};

// ------------------------------------------------------------- unsynced runs

const UNSYNCED = "zetamath.unsynced";
let memory: Record<string, Run> = {};

function load(): Record<string, Run> {
  const stored = read(UNSYNCED);
  if (typeof stored !== "object" || stored === null) return memory;
  const out: Record<string, Run> = {};
  for (const v of Object.values(stored)) {
    const run = parseRun(v);
    if (run) out[run.id] = run;
  }
  return out;
}

function save(next: Record<string, Run>) {
  memory = next;
  write(UNSYNCED, next);
}

export const unsynced = {
  all: (): Run[] => Object.values(load()),
  put(run: Run) {
    save({ ...load(), [run.id]: run });
  },
  /** Drop runs the server now has, unless they changed again meanwhile. */
  confirm(sent: readonly Run[]) {
    const now = load();
    for (const r of sent) {
      if (JSON.stringify(now[r.id]) === JSON.stringify(r)) delete now[r.id];
    }
    save(now);
  },
};
