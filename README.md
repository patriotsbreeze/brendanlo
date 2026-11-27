# brendanlo.dev

Personal site, live at <https://brendanlo.dev>. Next.js 16 App Router, no CSS
framework, no `next/font`, system UI stack. Each page has its own root layout:

- `/`: one static page of text (name, links, bio, highlights, takes). No client
  components.
- `/zetamath`: a timed arithmetic drill, accounts, graphs of every run, stats on
  where the time goes, and tricks.

```bash
npm run dev
```

## Layout

| Path | What's in it |
| :--- | :--- |
| `src/app/(home)/page.tsx` | The home page. Content is inline JSX, not data arrays — edit the copy in place. |
| `src/app/(home)/globals.css` | Every home style. ~160 lines, no CSS modules, locked to light via `color-scheme: light`. |
| `src/app/(home)/layout.tsx` | Home metadata, OpenGraph/Twitter cards, and the `Person` JSON-LD block. |
| `src/app/global-not-found.tsx` | The 404 for unmatched URLs, since there is no shared root layout. |
| `src/app/(zetamath)/` | `/zetamath`: see below. |
| `src/app/icon.png`, `apple-icon.png` | Favicon and touch icon (headshot). |
| `public/BrendanLo_Resume.pdf` | Resume, linked from the top row. |
| `public/robots.txt`, `sitemap.xml` | Hand-written; `sitemap.xml` has a `lastmod` to bump. |

The home description string is shared between `metadata` and the JSON-LD in
`(home)/layout.tsx` — change `DESCRIPTION` once and both follow. Everything else in the
page copy lives only in `page.tsx`.

The email is written out as a decoy string with a working `mailto` underneath, in
`page.tsx` only.

## Domain

The canonical URL is hard-coded rather than read from an env var, so changing
domains means editing each of these by hand:

| Path | What to change |
| :--- | :--- |
| `src/app/(zetamath)/layout.tsx` | `metadataBase` |
| `src/app/(home)/layout.tsx` | `metadataBase`, the OpenGraph `url`, and the JSON-LD `url` |
| `public/sitemap.xml` | `<loc>` |
| `public/robots.txt` | the `Sitemap:` line |

DNS and the domain binding itself live in Vercel, outside this repo. The build
passes either way, so a missed record only shows up as a dead link. `brendanlo.com`
is the previous domain and should stay pointed here so old links survive.

## /zetamath

Anyone can play. With an account (a username and a password, no email) your runs
are kept and graphed, and nobody else can open them. `blo` is the owner, which only
means it can't be deleted through the site.

| Path (under `src/app/(zetamath)/zetamath/`) | What's in it |
| :--- | :--- |
| `_lib/problems.ts` | Settings and the problem generator. `STANDARD` is the 120 s default. |
| `_lib/tricks.ts` | Every trick as code: which problems it fits and how it works one. The page, the drills, the percentages and the "a faster way" links all read from here. |
| `_lib/runs.ts` | The shape of a run, its validation, and the grouping the graphs use. |
| `_lib/kinds.ts` | The general kinds of problem ("7 × …", carries, borrows, answer size) the stats split answers into. |
| `_lib/stats.ts` | Periods (day, Monday week, month, all time) and every sum the stats tab shows: per operation, kind and problem, weak spots, maps, trend lines. |
| `_lib/accounts.ts` | The rules for usernames and passwords, and the words for every refusal. |
| `_lib/browser.ts` | Remembered settings, and the queue of runs the server has not confirmed. |
| `_server/db.ts`, `devdb.ts`, `session.ts` | The database, the local one, and the login cookie. |
| `api/` | Read and record runs, log in and out, change a password, delete an account. |
| `_components/` | Play, graphs and stats (hand-drawn SVG, no chart library), account, trick drills. |

- **Database.** Postgres on Supabase, project `zetamath`. All of it is
  `supabase/migrations/`: tables the API cannot see, and the `zetamath_*` functions
  that are the only way in. The key in `_server/db.ts` is the publishable one and
  is meant to be public, so those functions trust nobody. There are no
  environment variables to set.
- **Changing the schema.** Add a migration, run the tests, then
  `supabase db push` (after `supabase link --project-ref qsgcljgkbtenripxkegb`).
- **A new database.** Push the migrations, then make the owner before anyone else
  can take the name: `insert into zetamath.accounts (username, password_hash, owner)
  values ('blo', zetamath.hash_password('...'), true);`
- **Passwords.** Stored as bcrypt. Forgotten ones are reset in the Supabase SQL
  editor: `select zetamath.set_password('someone', 'a new password');`
- **Free plan.** Supabase pauses a free project that gets few requests for a week,
  so a daily cron in `vercel.json` makes some. If it is paused anyway, restore it
  from the Supabase dashboard: runs wait in the browser they were played in
  meanwhile. There are no automatic backups on the free plan.
- **Scores** are written once. They can be left out of the graphs and put back,
  never edited. So are a run's answers (`[operation, a, b, ms, misses]` each),
  which runs played before 2026-11-26 do not have. Each account but the owner
  can store 20,000 answers a day (`zetamath.answers_limit()`), since answers
  make a run some two hundred times bigger.
- **Local.** `npm run dev` runs the same migrations in a Postgres inside the
  process and keeps it in `.data/` (gitignored). The owner there is `blo` /
  `localhost`. Preview deployments have no database; `ZETAMATH_DB_URL` and
  `ZETAMATH_DB_KEY` would give them one.
- Runs on different settings are never graphed together; `settingsKey()` is what
  decides "different".
- `npm run test:zetamath` checks the database functions as a stranger would call
  them, works every trick on every standard problem it fits, and checks that the
  stats add up.
- The stats tab keeps its view in the address (`?span=week&day=2026-11-26`), so a
  reload or a link lands on the same period.

## Deploy

Vercel, from `main` (`vercel.json` pins the framework preset and the cron). No
environment variables.

```bash
npm run build           # next build
npm run lint            # eslint
npm run test:zetamath   # the database and the tricks
```

## Other files

`githubREADME.md` is a draft of a GitHub *profile* readme (the bio/stats card
version). Nothing on this site reads it; it is kept here as the working copy.

The previous WebGL/editorial design is archived on the `archive/v2-editorial-webgl`
branch.
