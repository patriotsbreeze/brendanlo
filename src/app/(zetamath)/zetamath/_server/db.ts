import { refusalStatus } from "../_lib/accounts.ts";

/* The only way to the database: call one of the zetamath_* functions in
 * supabase/migrations, which do all the checking.
 *
 * The key is Supabase's publishable one. It is meant to be public, and can do
 * nothing but call those functions. Only the production deployment uses it:
 * `next dev` runs the same SQL in this process, and a preview has no database
 * unless it is given one in the environment.
 *
 * A few functions take a Google account on this server's word, once it has
 * checked the ID token (_server/google.ts). Those are granted to service_role
 * alone, and called with Supabase's secret key, from ZETAMATH_DB_SECRET: an
 * `sb_secret_...` key, which must never reach a browser or the repo. */

const LIVE = {
  url: "https://qsgcljgkbtenripxkegb.supabase.co",
  key: "sb_publishable_TAQgJ_JVAI0irS7K4TgedQ_YtvCYGTq",
};

const { ZETAMATH_DB_URL, ZETAMATH_DB_KEY, ZETAMATH_DB_SECRET, VERCEL_ENV } = process.env;
const remote =
  ZETAMATH_DB_URL && ZETAMATH_DB_KEY
    ? { url: ZETAMATH_DB_URL, key: ZETAMATH_DB_KEY }
    : VERCEL_ENV === "production"
      ? LIVE
      : null;

export class Refused extends Error {
  // Not a parameter property, which scripts/ (node, stripping types) can't read.
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

type As = "anon" | "server";

async function send(fn: string, args: Record<string, unknown>, as: As): Promise<unknown> {
  if (remote) {
    const key = as === "server" ? ZETAMATH_DB_SECRET : remote.key;
    // Not set up here yet, which only Google sign-in needs.
    if (!key) throw new Refused("google_off");
    const res = await fetch(`${remote.url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      // Not the details: they can quote what was sent, and that can be a password.
      const why = (await res.json().catch(() => null)) as { code?: string; message?: string } | null;
      throw new Error(`${fn}: ${res.status} ${why?.code ?? ""} ${why?.message ?? ""}`);
    }
    return res.json();
  }
  if (process.env.NODE_ENV === "development") {
    const { callDev } = await import("./devdb");
    return callDev(fn, args, as === "server" ? "service_role" : "anon");
  }
  throw new Refused("no_database");
}

async function answer<T>(name: string, args: Record<string, unknown>, as: As): Promise<T> {
  const said = (await send(`zetamath_${name}`, args, as)) as { error?: string };
  if (typeof said?.error === "string") throw new Refused(said.error);
  return said as T;
}

/** Throws Refused when the database says no, which respond() turns into a reply. */
export async function call<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  return answer<T>(name, args, "anon");
}

/** The same, for the functions only this server may call. Never pass them
 * anything about a Google account that _server/google.ts has not checked. */
export async function callAsServer<T>(name: string, args: Record<string, unknown>): Promise<T> {
  return answer<T>(name, args, "server");
}

/** Run a route's body, and turn whatever it throws into a JSON error. */
export async function respond(body: () => Promise<unknown>): Promise<Response> {
  const json = (value: unknown, status = 200) =>
    Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
  try {
    return json(await body());
  } catch (e) {
    if (e instanceof Refused) return json({ error: e.code }, refusalStatus(e.code));
    console.error("zetamath:", e);
    return json({ error: "unreachable" }, refusalStatus("unreachable"));
  }
}

/** The request's JSON object. Insisting on the content type means another site
 * cannot post a form here. */
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) return {};
  const body: unknown = await request.json().catch(() => null);
  return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
}

/** A short string from that object, in one spelling, or "" for anything the
 * database could not store as text. */
export function text(v: unknown): string {
  if (typeof v !== "string" || v.length > 200 || v.includes("\0") || !v.isWellFormed()) return "";
  return v.normalize("NFC");
}
