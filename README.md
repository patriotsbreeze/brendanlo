# brendanlo.dev

Personal site, live at <https://brendanlo.dev>. Next.js 16 App Router, no CSS
framework. Each page has its own root layout:

- `/`: one static page of text (name, links, bio, highlights, takes). No client
  components, no `next/font`, system UI stack.
- `/experimental`: the same person as a 3D "shape display". Each project's
  real data shape (a depth map, a street graph, a pass@k field, a meal's depth
  mesh) is pressed into a lit bed of pins. Yellow pin tips are what a model
  said; green is what something deterministic checked. The only page that uses
  `next/font` or `three`.
- `/zetamath`: a timed arithmetic drill, accounts, graphs of every run, and tricks.
  System UI stack.

```bash
npm run dev
```

## Layout

The pages are route groups with their own root layouts, so no page's CSS,
fonts, or metadata can reach another (navigating between them is a full page
load). See `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md`.

| Path | What's in it |
| :--- | :--- |
| `src/app/(home)/page.tsx` | The home page. Content is inline JSX, not data arrays; edit the copy in place. |
| `src/app/(home)/globals.css` | Every home style. ~160 lines, no CSS modules, locked to light via `color-scheme: light`. |
| `src/app/(home)/layout.tsx` | Home metadata, OpenGraph/Twitter cards, and the `Person` JSON-LD block. |
| `src/app/global-not-found.tsx` | The 404 for unmatched URLs (needs `experimental.globalNotFound` in `next.config.ts`, since there is no shared root layout). Renders the same 404 the site always had. |
| `src/app/(lab)/layout.tsx` | `/experimental` root: fonts, `lab.css`, metadata (`noindex` while experimental). |
| `src/app/(lab)/experimental/page.tsx` | All `/experimental` copy, server-rendered. Client islands enhance it. |
| `src/app/(lab)/experimental/_tensors/` | Pure functions that build each bed's pin heights and dyes (no three, no React). Shared by the WebGL beds, the SVG posters and the DOM readouts. |
| `src/app/(lab)/experimental/_components/stage/` | The renderer: plain three, one canvas per bed, lazy-loaded after idle. The only code that imports `three`. |
| `src/app/(lab)/experimental/_components/` | Store, capability probe, bed slot, controls, posters. |
| `src/app/(lab)/experimental/_content/resourceCommits.json` | ReSource's real commit log (from the public `hoohacksv2` repo). |
| `src/app/(zetamath)/` | `/zetamath`: see below. |
| `scripts/verify-tensors.mts` | Checks for the `/experimental` tensors: shapes, BFS, pass@k monotonicity, the engine never letting a model lower urgency, MAP bounds. |
| `src/app/icon.png`, `apple-icon.png` | Favicon and touch icon (headshot). Apply to every page. |
| `public/BrendanLo_Resume.pdf` | Resume, linked from the home page's top row. |
| `public/robots.txt`, `sitemap.xml` | Hand-written; `sitemap.xml` has a `lastmod` to bump. |

The home description string is shared between `metadata` and the JSON-LD in
`(home)/layout.tsx`; change `DESCRIPTION` once and both follow. Everything else
in the home copy lives only in `(home)/page.tsx`. The email is written out as a
decoy string with a working `mailto` underneath, on `/` and `/experimental`.

### /experimental notes

- Testing overrides: `?gl=off` forces the SVG poster fallback, `?tier=low|mid|high`
  pins a quality tier. `g` toggles grader view; typing `swag` does what you'd
  expect. Both can be switched off in the footer.
- Stand-ins are labelled on the page: the HealthAR depth is a synthetic
  manikin, the SIDEWALK grid is schematic and its rules paraphrased, the pass@k
  field is a toy, the meal is a demo plate. The HealthAR protocol states and
  urgencies are the real ones from that repo's `clinical/adult_arrest.v1.json`.
- It is `noindex` and not in `sitemap.xml`. To launch it, flip `robots` in
  `(lab)/layout.tsx` and add a `<url>` to `sitemap.xml`. Do not `Disallow` it in
  `robots.txt`, or crawlers never see the `noindex`.

## Domain

The canonical URL is hard-coded rather than read from an env var, so changing
domains means editing each of these by hand:

| Path | What to change |
| :--- | :--- |
| `src/app/(home)/layout.tsx` | `metadataBase`, the OpenGraph `url`, and the JSON-LD `url` |
| `src/app/(lab)/layout.tsx` | `metadataBase` and the OpenGraph `url` |
| `src/app/(zetamath)/layout.tsx` | `metadataBase` |
| `public/sitemap.xml` | `<loc>` |
| `public/robots.txt` | the `Sitemap:` line |

DNS and the domain binding itself live in Vercel, outside this repo. The build
passes either way, so a missed record only shows up as a dead link. `brendanlo.com`
is the previous domain and should stay pointed here so old links survive.

## /zetamath

Anyone can play. With an account (a username and a password, no email) your runs
are kept and graphed, and nobody else can open them. The `brendan` account is the
owner: its graphs are the ones everyone sees.

| Path (under `src/app/(zetamath)/zetamath/`) | What's in it |
| :--- | :--- |
| `_lib/problems.ts` | Settings and the problem generator. `STANDARD` is the 120 s default. |
| `_lib/tricks.ts` | Every trick as code: which problems it fits and how it works one. The page, the drills, the percentages and the "a faster way" links all read from here. |
| `_lib/runs.ts` | The shape of a run, its validation, and the grouping the graphs use. |
| `_lib/accounts.ts` | The rules for usernames and passwords, and the words for every refusal. |
| `_lib/browser.ts` | Remembered settings, and the queue of runs the server has not confirmed. |
| `_server/db.ts`, `devdb.ts`, `session.ts` | The database, the local one, and the login cookie. |
| `api/` | Read and record runs, log in and out, change a password, delete an account. |
| `_components/` | Play, graphs (hand-drawn SVG, no chart library), account, trick drills. |

- **Database.** Postgres on Supabase, project `zetamath`. All of it is
  `supabase/migrations/`: tables the API cannot see, and the `zetamath_*` functions
  that are the only way in. The key in `_server/db.ts` is the publishable one and
  is meant to be public, so those functions trust nobody. There are no
  environment variables to set.
- **Changing the schema.** Add a migration, run the tests, then
  `supabase db push` (after `supabase link --project-ref qsgcljgkbtenripxkegb`).
- **A new database.** Push the migrations, then make the owner before anyone else
  can take the name: `insert into zetamath.accounts (username, password_hash, owner)
  values ('brendan', zetamath.hash_password('...'), true);`
- **Passwords.** Stored as bcrypt. Forgotten ones are reset in the Supabase SQL
  editor: `select zetamath.set_password('someone', 'a new password');`
- **Free plan.** Supabase pauses a free project that gets few requests for a week,
  so a daily cron in `vercel.json` makes some. If it is paused anyway, restore it
  from the Supabase dashboard: runs wait in the browser they were played in
  meanwhile. There are no automatic backups on the free plan.
- **Scores** are written once. They can be left out of the graphs and put back,
  never edited.
- **Local.** `npm run dev` runs the same migrations in a Postgres inside the
  process and keeps it in `.data/` (gitignored). The owner there is `brendan` /
  `localhost`. Preview deployments have no database; `ZETAMATH_DB_URL` and
  `ZETAMATH_DB_KEY` would give them one.
- Runs on different settings are never graphed together; `settingsKey()` is what
  decides "different".
- `npm run test:zetamath` checks the database functions as a stranger would call
  them, and works every trick on every standard problem it fits.

## Deploy

Vercel, from `main` (`vercel.json` pins the framework preset and the cron). No
environment variables.

```bash
npm run build                     # next build
npm run lint                      # eslint
npm run test:zetamath             # the database and the tricks
node scripts/verify-tensors.mts   # the /experimental tensors
```

## Other files

`githubREADME.md` is a draft of a GitHub *profile* readme (the bio/stats card
version). Nothing on this site reads it; it is kept here as the working copy.

The previous WebGL/editorial design is archived on the `archive/v2-editorial-webgl`
branch.
