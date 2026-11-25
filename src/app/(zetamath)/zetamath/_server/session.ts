import { cookies } from "next/headers";

/* Who is logged in: a random token in a cookie. The database has its hash. */

const COOKIE = "zetamath_session";
const DAYS = 180;

export async function token(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

export async function keep(value: string): Promise<void> {
  (await cookies()).set(COOKIE, value, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/zetamath",
    maxAge: DAYS * 86_400,
  });
}

export async function drop(): Promise<void> {
  (await cookies()).delete({ name: COOKIE, path: "/zetamath" });
}
