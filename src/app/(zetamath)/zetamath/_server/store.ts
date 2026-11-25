import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseRun, type Run } from "../_lib/runs";

/* Where runs live. One Redis hash, run id -> JSON, spoken to over Upstash's
 * REST API with fetch, so there is no client library to install. Vercel's
 * Upstash integration sets these variables by itself when the database is
 * connected to the project.
 *
 * With no database: `next dev` keeps a JSON file so the whole flow works
 * locally; a deployed build has nowhere durable to write and says so, and the
 * browser keeps the runs queued until it does. */

const URL_ = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

/** Previews and local dev share the database but not the data. */
const ENV = process.env.NODE_ENV === "development" ? "development" : process.env.VERCEL_ENV;
const KEY = ENV && ENV !== "production" ? `zetamath:runs:${ENV}` : "zetamath:runs";

const DEV_FILE = path.join(process.cwd(), ".data", "zetamath-runs.json");

export type StorageKind = "redis" | "file" | "none";

export function storageKind(): StorageKind {
  if (URL_ && TOKEN) return "redis";
  return process.env.NODE_ENV === "development" ? "file" : "none";
}

async function redis(command: string[]): Promise<unknown> {
  const res = await fetch(URL_ as string, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const body = (await res.json()) as { result?: unknown; error?: string };
  if (!res.ok || body.error) throw new Error(`redis ${command[0]}: ${body.error ?? res.status}`);
  return body.result;
}

async function readDevFile(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await readFile(/* turbopackIgnore: true */ DEV_FILE, "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw e;
  }
}

export async function readRuns(): Promise<Run[]> {
  const kind = storageKind();
  let values: string[] = [];
  if (kind === "redis") {
    const result = await redis(["HVALS", KEY]);
    values = Array.isArray(result) ? result.map(String) : [];
  } else if (kind === "file") {
    values = Object.values(await readDevFile());
  }
  return values.flatMap((json) => parseRow(json) ?? []);
}

/** One unreadable row should not take the page down with it. */
function parseRow(json: string): Run | null {
  try {
    return parseRun(JSON.parse(json));
  } catch {
    return null;
  }
}

async function readRows(ids: readonly string[]): Promise<(string | null)[]> {
  if (storageKind() === "redis") {
    const result = await redis(["HMGET", KEY, ...ids]);
    return ids.map((_, i) => (Array.isArray(result) && result[i] != null ? String(result[i]) : null));
  }
  const all = await readDevFile();
  return ids.map((id) => all[id] ?? null);
}

/** Add runs, by id. A run that is already stored keeps its score: only its
 * excluded flag can change. Ids are public and the password may be weak, so
 * whatever gets in here can be undone from the graphs page. */
export async function writeRuns(incoming: readonly Run[]): Promise<void> {
  if (incoming.length === 0) return;
  const kind = storageKind();
  if (kind === "none") throw new Error("no storage connected");
  const stored = await readRows(incoming.map((r) => r.id));
  const runs = incoming.map((r, i) => {
    const json = stored[i];
    const before = json === null ? null : parseRow(json);
    return before ? { ...before, excluded: r.excluded } : r;
  });
  if (kind === "redis") {
    await redis(["HSET", KEY, ...runs.flatMap((r) => [r.id, JSON.stringify(r)])]);
  } else {
    const all = await readDevFile();
    for (const r of runs) all[r.id] = JSON.stringify(r);
    await mkdir(/* turbopackIgnore: true */ path.dirname(DEV_FILE), { recursive: true });
    await writeFile(/* turbopackIgnore: true */ DEV_FILE, JSON.stringify(all, null, 1));
  }
}
