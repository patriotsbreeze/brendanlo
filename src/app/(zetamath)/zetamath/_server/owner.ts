import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/* Owner mode: one password, one signed cookie. Set ZETAMATH_PASSWORD in Vercel
 * to change the password; everyone signed in is then signed out, because the
 * signing key is derived from it. The database token is mixed in so the key is
 * not computable from this (public) repo. */

const PASSWORD = process.env.ZETAMATH_PASSWORD || "pw";
const COOKIE = "zetamath_owner";
const DAYS = 180;

const KEY = createHash("sha256")
  .update(
    ["zetamath", PASSWORD, process.env.KV_REST_API_TOKEN, process.env.UPSTASH_REDIS_REST_TOKEN].join("\n"),
  )
  .digest();

const sign = (payload: string) => createHmac("sha256", KEY).update(payload).digest("base64url");

const digest = (s: string) => createHash("sha256").update(s).digest();
const equal = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

export const passwordMatches = (guess: string) => equal(guess, PASSWORD);

export async function isOwner(): Promise<boolean> {
  const value = (await cookies()).get(COOKIE)?.value ?? "";
  const [expires, mac] = value.split(".");
  if (!expires || !mac || !equal(mac, sign(expires))) return false;
  return Number(expires) > Date.now();
}

export async function signIn(): Promise<void> {
  const expires = String(Date.now() + DAYS * 86_400_000);
  (await cookies()).set(COOKIE, `${expires}.${sign(expires)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/zetamath",
    maxAge: DAYS * 86_400,
  });
}

export async function signOut(): Promise<void> {
  (await cookies()).delete({ name: COOKIE, path: "/zetamath" });
}
