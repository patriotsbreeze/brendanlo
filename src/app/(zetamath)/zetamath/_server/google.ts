import { GOOGLE_CLIENT_ID, nonceFor, PROOF } from "../_lib/google.ts";
import { Refused } from "./db.ts";

/* Who a Google ID token says signed in, once it is checked the way Google asks:
 * https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
 * Its signature against Google's published keys, then that Google issued it, for
 * this site's client, lately, and for this page's sign-in. Only what passes all
 * of that reaches the functions in db.ts that believe it. */

const KEYS = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);
/** Seconds this server's clock may be off from Google's. */
const SKEW = 60;
const RS256 = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" } as const;

export type GoogleUser = {
  /** Google's own id for the account, which never changes or goes to anyone else. */
  sub: string;
  /** Not checked against anything, and never stored: only for suggesting a name. */
  email?: string;
};

/** Google's public key with this id, or null. */
export type KeyFinder = (kid: string) => Promise<CryptoKey | null>;

type Want = { clientId: string; nonce: string; keys?: KeyFinder; now?: number };

/** The account a token is for, or null for anything not quite right. */
export async function verifyIdToken(token: string, want: Want): Promise<GoogleUser | null> {
  if (!want.clientId || token.length > 8192) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || !parts.every((p) => /^[A-Za-z0-9_-]+$/.test(p))) return null;
  const header = json(parts[0]);
  const claims = json(parts[1]);
  // Only the one algorithm Google signs with, so "none" or a shared secret can't
  // be slipped in.
  if (!header || !claims || header.alg !== "RS256" || typeof header.kid !== "string") return null;

  const key = await (want.keys ?? googleKey)(header.kid);
  if (!key) return null;
  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  if (!(await crypto.subtle.verify(RS256, key, bytes(parts[2]), signed))) return null;

  const now = (want.now ?? Date.now()) / 1000;
  const { iss, aud, azp, exp, iat, nonce, sub, email } = claims;
  if (typeof iss !== "string" || !ISSUERS.has(iss)) return null;
  // One audience, as a string: Google never sends a list.
  if (aud !== want.clientId || (azp !== undefined && azp !== want.clientId)) return null;
  if (typeof exp !== "number" || exp + SKEW < now) return null;
  if (typeof iat !== "number" || iat - SKEW > now) return null;
  if (nonce !== want.nonce) return null;
  if (typeof sub !== "string" || !/^[!-~]{1,255}$/.test(sub)) return null;
  return { sub, email: typeof email === "string" ? email : undefined };
}

/** What a route was sent as {credential, proof}, checked. Throws Refused. */
export async function googleUser(sent: unknown): Promise<GoogleUser> {
  if (!GOOGLE_CLIENT_ID) throw new Refused("google_off");
  const { credential, proof } = (typeof sent === "object" && sent !== null ? sent : {}) as Record<
    string,
    unknown
  >;
  if (typeof credential !== "string" || typeof proof !== "string" || !PROOF.test(proof)) {
    throw new Refused("bad_google");
  }
  const user = await verifyIdToken(credential, {
    clientId: GOOGLE_CLIENT_ID,
    nonce: await nonceFor(proof),
  });
  if (!user) throw new Refused("bad_google");
  return user;
}

function bytes(part: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(Buffer.from(part, "base64url"));
}

function json(part: string): Record<string, unknown> | null {
  try {
    const v: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes(part)));
    return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------ Google's keys

type Cached = { keys: Map<string, CryptoKey>; until: number; at: number };
let cached: Cached | null = null;

/** Kept as long as Google says, and fetched again early for an id not seen yet,
 * since Google brings in each new key before signing with it. */
async function googleKey(kid: string): Promise<CryptoKey | null> {
  const now = Date.now();
  if (!cached || now > cached.until || (!cached.keys.has(kid) && now - cached.at > 60_000)) {
    cached = await fetchKeys(now);
  }
  return cached.keys.get(kid) ?? null;
}

async function fetchKeys(now: number): Promise<Cached> {
  const res = await fetch(KEYS, { cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`google keys: ${res.status}`);
  const { keys: list } = (await res.json()) as { keys?: unknown };
  const keys = new Map<string, CryptoKey>();
  for (const jwk of Array.isArray(list) ? (list as Record<string, unknown>[]) : []) {
    const { kty, kid, n, e, alg, use } = jwk ?? {};
    if (kty !== "RSA" || typeof kid !== "string" || typeof n !== "string" || typeof e !== "string") continue;
    if ((alg !== undefined && alg !== "RS256") || (use !== undefined && use !== "sig")) continue;
    keys.set(kid, await crypto.subtle.importKey("jwk", { kty, n, e }, RS256, false, ["verify"]));
  }
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get("cache-control") ?? "")?.[1] ?? 3600);
  return { keys, until: now + Math.min(maxAge, 86_400) * 1000, at: now };
}
