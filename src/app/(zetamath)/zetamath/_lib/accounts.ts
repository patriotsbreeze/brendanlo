/* What the forms, the API and the database agree on about accounts. */

export type Account = {
  username: string;
  /** Whose site this is. Can't be deleted here. */
  owner: boolean;
  /** Logs in with a password. Only an account made with Google has none. */
  password: boolean;
  /** A Google account can log in to it too. */
  google: boolean;
};

/** The owner's username, for runs this site queued before it had accounts. */
export const OWNER = "blo";

/** The owner was called "brendan" at first, and nobody else can be. Only for what a
 * browser remembers: the server's own word is never changed. */
export const renamed = (username: string) => (username === "brendan" ? OWNER : username);

/** The database checks the same: lowercase letters, digits, underscores. */
export const USERNAME = /^[a-z0-9_]{3,20}$/;
export const cleanUsername = (typed: string) => typed.trim().toLowerCase();

export const PASSWORD_MIN = 8;

export function parseAccount(v: unknown): Account | null {
  if (typeof v !== "object" || v === null) return null;
  const a = v as Record<string, unknown>;
  if (typeof a.username !== "string" || !USERNAME.test(a.username)) return null;
  // Said by every reply since Google sign-in. One from before, or a log-in with a
  // password, means a password and no Google.
  return {
    username: a.username,
    owner: a.owner === true,
    password: a.password !== false,
    google: a.google === true,
  };
}

/** What the database says when it will not do something, and the HTTP status
 * and words for it. */
const REFUSALS: Record<string, readonly [status: number, words: string]> = {
  wrong: [401, "wrong username or password."],
  not_logged_in: [401, "you're not logged in any more. reload the page."],
  owner: [403, "this account can't be deleted here."],
  taken: [409, "that username is taken."],
  other_account: [409, "another account is logged in now. reload the page."],
  bad_username: [400, "usernames are 3 to 20 letters, numbers or underscores."],
  bad_password: [400, `passwords are at least ${PASSWORD_MIN} characters, and at most 72.`],
  bad_runs: [400, "those runs don't look right."],
  bad_range: [400, "those days don't look right."],
  slow_down: [429, "too many tries. wait 15 minutes."],
  busy: [429, "too many new accounts right now. try again in an hour."],
  full: [409, "this account has all the runs it can hold."],
  bad_google: [401, "google sign-in didn't work. try again."],
  google_taken: [409, "that google account has its own zetamath account already."],
  linked: [409, "this account is linked to a google account already."],
  other_google: [403, "that's not the google account linked to this one."],
  no_password: [409, "this account has no password, so google is its only way in."],
  has_password: [409, "this account has a password, so it's deleted with that."],
  google_off: [503, "google sign-in is off on this copy of the site."],
  no_database: [503, "accounts are off on this copy of the site."],
  unreachable: [503, "couldn't reach the database. try again."],
};

export const refusalStatus = (code: string) => REFUSALS[code]?.[0] ?? 500;
export const refusalWords = (code: string | undefined) =>
  REFUSALS[code ?? ""]?.[1] ?? "that didn't work. try again.";
