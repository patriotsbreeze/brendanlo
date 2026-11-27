import { USERNAME } from "./accounts.ts";

/* What the Google button and the server agree on. */

/** The OAuth client the button signs in to: a "Web application" client in
 * Google Cloud whose authorized JavaScript origins are https://brendanlo.dev,
 * each short name in hosts.ts (https://z.brendanlo.dev and the rest), and
 * http://localhost, :3000 and :3001. Google takes no *.localhost origin, so the
 * button does not work on z.localhost. Public, since every page with the
 * button has it, but it is read when the site is built, so it lives in the
 * environment (.env.local for `next dev`, Vercel for the site). Without it there
 * is no button. */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_ZETAMATH_GOOGLE_CLIENT_ID ?? "";

/** An ID token from the button, and the secret its nonce was made from. */
export type GoogleProof = { credential: string; proof: string };

export const PROOF = /^[A-Za-z0-9_-]{43}$/;

export function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** A new secret for this page. Google puts only its hash in the token, so a token
 * that leaks on its own is no good to anyone: whoever sends it must know this. */
export function newProof(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function nonceFor(proof: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(proof));
  return base64url(new Uint8Array(hash));
}

/** A username to start from, out of an email address: only ever a suggestion. */
export function suggestUsername(email: string | undefined): string {
  const name = (email?.split("@")[0] ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
  return USERNAME.test(name) ? name : "";
}
