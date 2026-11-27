import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "privacy",
  description: "what zetamath keeps about you, and how to delete it.",
  alternates: { canonical: "/zetamath/privacy" },
};

/* Linked from Google's sign-in screen, so it must stay true to
 * supabase/migrations and _lib/browser.ts. Change it with them. */

export default function Page() {
  return (
    <div className="holding">
      <h1>privacy</h1>
      <p className="lede">
        zetamath keeps as little as it can: no email, no name, no ads, no analytics, nothing sold or
        shared. you can play without an account, and then nothing about you is kept anywhere but
        your own browser.
      </p>

      <section className="accountPart">
        <h2>with an account</h2>
        <ul>
          <li>your username.</li>
          <li>
            if you log in with a password, a bcrypt hash of it. nobody can read the password back.
          </li>
          <li>
            if you log in with google, a hash of the id google gives your google account. not your
            email address, name or picture.
          </li>
          <li>
            your runs: when each was played and the clock&rsquo;s time zone, the score, the settings,
            the time per operation, and each answer with how long it took and how many tries.
          </li>
          <li>a hash of each browser&rsquo;s login, for up to 180 days.</li>
          <li>log-in attempts, for about 15 minutes, to slow down guessing.</li>
        </ul>
        <p>nobody else can open your runs or your graphs.</p>
      </section>

      <section className="accountPart">
        <h2>logging in with google</h2>
        <p>
          google tells zetamath your google account&rsquo;s id, email address and name. the site
          checks google&rsquo;s signature, keeps only the hash of the id, and uses the part of the
          email before the @ to suggest a username, which you can change. the rest is thrown away.
          zetamath asks google for nothing else and can do nothing in your google account.
        </p>
      </section>

      <section className="accountPart">
        <h2>in your browser</h2>
        <p>
          one cookie keeps you logged in, and is only sent to zetamath. your settings, who was
          logged in last, and runs not yet saved are kept in this browser&rsquo;s local storage.
        </p>
      </section>

      <section className="accountPart">
        <h2>where it is</h2>
        <p>
          the site runs on vercel and the database on supabase. like any web host, they keep short
          logs of requests, such as ip addresses.
        </p>
      </section>

      <section className="accountPart">
        <h2>deleting it</h2>
        <p>
          the account tab deletes your account and every run in it at once, for good. there are no
          backups to bring it back from. to ask anything else, reach brendan through the links on{" "}
          <a href="https://brendanlo.dev">brendanlo.dev</a>.
        </p>
      </section>
    </div>
  );
}
