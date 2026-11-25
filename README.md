# brendanlo.dev

Personal site, live at <https://brendanlo.dev>. Next.js 16 App Router, no CSS
framework, no `next/font`, system UI stack. Each page has its own root layout:

- `/`: one static page of text (name, links, bio, highlights, takes). No client
  components.
- `/zetamath`: a timed arithmetic drill, graphs of every run, and tricks.

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
| `src/app/(zetamath)/layout.tsx` | `metadataBase` and the OpenGraph `url` |
| `src/app/(home)/layout.tsx` | `metadataBase`, the OpenGraph `url`, and the JSON-LD `url` |
| `public/sitemap.xml` | `<loc>` |
| `public/robots.txt` | the `Sitemap:` line |

DNS and the domain binding itself live in Vercel, outside this repo. The build
passes either way, so a missed record only shows up as a dead link. `brendanlo.com`
is the previous domain and should stay pointed here so old links survive.

## /zetamath

Anyone can play. Only runs played while logged in are recorded, and everyone
sees the graphs of those.

| Path (under `src/app/(zetamath)/zetamath/`) | What's in it |
| :--- | :--- |
| `_lib/problems.ts` | Settings and the problem generator. `STANDARD` is the 120 s default. |
| `_lib/tricks.ts` | Every trick as code: which problems it fits and how it works one. The page, the drills, the percentages and the "a faster way" links all read from here. |
| `_lib/runs.ts` | The stored shape of a run, its validation, and the grouping the graphs use. |
| `_lib/browser.ts` | Remembered settings, and the queue of runs the server has not confirmed. |
| `_server/store.ts`, `owner.ts` | The database, and the password and cookie. |
| `api/runs`, `api/session` | Read and record runs; log in and out. |
| `_components/` | Play, graphs (hand-drawn SVG, no chart library), trick drills. |

- **Database.** Vercel → the project → Storage → add *Upstash for Redis* and
  connect it, then redeploy. It sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`
  itself. Until then runs queue in the browser they were played in and upload
  the next time that browser is logged in. Preview deployments use a separate
  key, so they cannot touch the real runs.
- **Password.** `pw` unless `ZETAMATH_PASSWORD` is set. This repo is public, so
  set it if strangers adding runs would bother you. Changing it, or connecting
  the database, logs everyone out. A recorded score can never be edited or
  deleted through the API, only left out of the graphs and put back.
- **Local.** `npm run dev` records to `.data/zetamath-runs.json` (gitignored).
- Runs on different settings are never graphed together; `settingsKey()` is what
  decides "different".
- After editing a trick, run `node scripts/verify-tricks.mts`. It works every
  trick on every standard problem it fits and checks each line it prints.

## Deploy

Vercel, from `main` (`vercel.json` pins the framework preset). Env vars are
optional and only for `/zetamath`, above.

```bash
npm run build   # next build
npm run lint    # eslint
node scripts/verify-tricks.mts
```

## Other files

`githubREADME.md` is a draft of a GitHub *profile* readme (the bio/stats card
version). Nothing on this site reads it; it is kept here as the working copy.

The previous WebGL/editorial design is archived on the `archive/v2-editorial-webgl`
branch.
