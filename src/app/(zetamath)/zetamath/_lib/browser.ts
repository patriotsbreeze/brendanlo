import { OWNER, parseAccount, renamed, USERNAME, type Account } from "./accounts";
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

/** False in a private window or on a full disk. */
function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
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

// ----------------------------------------------------------------- account

const ACCOUNT = "zetamath.account";

/** Who was logged in here last time the server said. Only decides what to queue
 * while the server cannot be asked; the server still checks. */
export const accountHint = {
  get(): Account | null {
    const last = parseAccount(read(ACCOUNT));
    return last && { ...last, username: renamed(last.username) };
  },
  set(v: Account | null) {
    write(ACCOUNT, v);
  },
  /** Another tab logged in or out. */
  onChange(listener: () => void) {
    const heard = (e: StorageEvent) => {
      if (e.key === ACCOUNT) listener();
    };
    window.addEventListener("storage", heard);
    return () => window.removeEventListener("storage", heard);
  },
};

// ------------------------------------------------------------- unsynced runs

/** Each run with the account it was played under, so that it can never land in
 * another one that logs in on this browser. */
type Queue = Record<string, { run: Run; username: string }>;

const QUEUE = "zetamath.queue";
/** Before accounts: bare runs, every one of them the owner's. */
const OLD_QUEUE = "zetamath.unsynced";
/** The queue as last written, for when storage will not take it. */
let memory: Queue = {};
let stuck = false;
const adopted = new Set<string>();

function load(): Queue {
  const stored = read(QUEUE);
  const out: Queue = {};
  if (stuck || typeof stored !== "object" || stored === null) Object.assign(out, memory);
  else {
    for (const v of Object.values(stored) as { run?: unknown; username?: unknown }[]) {
      const run = parseRun(v?.run);
      if (run && typeof v.username === "string" && USERNAME.test(v.username)) {
        out[run.id] = { run, username: renamed(v.username) };
      }
    }
  }
  return adoptOld(out);
}

function adoptOld(queue: Queue): Queue {
  const old = read(OLD_QUEUE);
  if (typeof old !== "object" || old === null) return queue;
  const found = Object.values(old)
    .map(parseRun)
    .filter((r) => r !== null && !adopted.has(r.id));
  if (found.length === 0) return queue;
  for (const run of found) {
    if (!run) continue;
    // Newer than one adopted before: an old tab has ticked its box since.
    if ((queue[run.id]?.username ?? OWNER) === OWNER) queue[run.id] = { run, username: OWNER };
    adopted.add(run.id);
  }
  // Emptied only once they are safely in the new queue.
  if (save(queue)) {
    write(OLD_QUEUE, {});
    adopted.clear();
  }
  return queue;
}

function save(next: Queue): boolean {
  memory = next;
  stuck = !write(QUEUE, next);
  return !stuck;
}

export const unsynced = {
  of: (username: string): Run[] =>
    Object.values(load()).flatMap((q) => (q.username === username ? [q.run] : [])),
  /** Who has runs waiting here, and how many. */
  counts(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const q of Object.values(load())) out[q.username] = (out[q.username] ?? 0) + 1;
    return out;
  },
  /** A run waiting for one account is never handed to another. */
  put(run: Run, username: string) {
    const now = load();
    if (now[run.id] && now[run.id].username !== username) return;
    save({ ...now, [run.id]: { run, username } });
  },
  /** Drop runs the server now has, unless they changed again meanwhile. */
  confirm(sent: readonly Run[]) {
    const now = load();
    for (const r of sent) {
      if (JSON.stringify(now[r.id]?.run) === JSON.stringify(r)) delete now[r.id];
    }
    save(now);
  },
  /** Give up on an account's runs, because it is being deleted. */
  forget(username: string) {
    save(Object.fromEntries(Object.entries(load()).filter(([, q]) => q.username !== username)));
  },
};
