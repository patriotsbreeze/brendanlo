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
- `/zetamath`: a timed arithmetic drill, graphs of every run, and tricks. System
  UI stack.

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

Anyone can play. Runs are recorded when you are logged in, or when you choose to
save one on the results screen, and everyone sees the graphs of those.

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
- **Local.** `npm run dev` records to `.data/zetamath-runs.json` (gitignored), or
  to a separate development key if the database variables are in `.env.local`.
- Runs on different settings are never graphed together; `settingsKey()` is what
  decides "different".
- After editing a trick, run `node scripts/verify-tricks.mts`. It works every
  trick on every standard problem it fits, and checks the result and every
  equation it prints.

## Deploy

Vercel, from `main` (`vercel.json` pins the framework preset). Env vars are
optional and only for `/zetamath`, above.

```bash
npm run build   # next build
npm run lint    # eslint
node scripts/verify-tensors.mts
node scripts/verify-tricks.mts
```

## Other files

`githubREADME.md` is a draft of a GitHub *profile* readme (the bio/stats card
version). Nothing on this site reads it; it is kept here as the working copy.

The previous WebGL/editorial design is archived on the `archive/v2-editorial-webgl`
branch.
