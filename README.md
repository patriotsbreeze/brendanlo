# brendanlo.dev

Personal site, live at <https://brendanlo.dev>. Two pages with two separate root
layouts:

- `/`: one static page of text (name, links, bio, highlights, takes). No client
  components, no `next/font`, system UI stack.
- `/experimental`: the same person as a 3D "shape display". Each project's
  real data shape (a depth map, a street graph, a pass@k field, a meal's depth
  mesh) is pressed into a lit bed of pins. Yellow pin tips are what a model
  said; green is what something deterministic checked.

```bash
npm run dev
```

## Layout

The two pages are route groups with their own root layouts, so neither page's
CSS, fonts, or metadata can reach the other (navigating between them is a full
page load). See `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md`.

| Path | What's in it |
| :--- | :--- |
| `src/app/(home)/page.tsx` | The home page. Content is inline JSX, not data arrays; edit the copy in place. |
| `src/app/(home)/globals.css` | Every home style. ~160 lines, locked to light via `color-scheme: light`. |
| `src/app/(home)/layout.tsx` | Home metadata, OpenGraph/Twitter cards, and the `Person` JSON-LD block. |
| `src/app/global-not-found.tsx` | The 404 for unmatched URLs (needs `experimental.globalNotFound` in `next.config.ts`, since there is no shared root layout). Renders the same 404 the site always had. |
| `src/app/icon.png`, `apple-icon.png` | Favicon and touch icon (headshot). Apply to both pages. |
| `src/app/(lab)/layout.tsx` | `/experimental` root: fonts, `lab.css`, metadata (`noindex` while experimental). |
| `src/app/(lab)/experimental/page.tsx` | All `/experimental` copy, server-rendered. Client islands enhance it. |
| `src/app/(lab)/experimental/_tensors/` | Pure functions that build each bed's pin heights and dyes (no three, no React). Shared by the WebGL beds, the SVG posters and the DOM readouts. |
| `src/app/(lab)/experimental/_components/stage/` | The renderer: plain three, one canvas per bed, lazy-loaded after idle. The only code that imports `three`. |
| `src/app/(lab)/experimental/_components/` | Store, capability probe, bed slot, controls, posters. |
| `src/app/(lab)/experimental/_content/resourceCommits.json` | ReSource's real commit log (from the public `hoohacksv2` repo). |
| `scripts/verify-tensors.mts` | Checks for the tensors: shapes, BFS, pass@k monotonicity, the engine never letting a model lower urgency, MAP bounds. |
| `public/BrendanLo_Resume.pdf` | Resume, linked from the home page's top row. |
| `public/robots.txt`, `sitemap.xml` | Hand-written; `sitemap.xml` has a `lastmod` to bump. |

The home description string is shared between `metadata` and the JSON-LD in
`(home)/layout.tsx`; change `DESCRIPTION` once and both follow. The email is
written out as a decoy string with a working `mailto` underneath, on both pages.

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
| `public/sitemap.xml` | `<loc>` |
| `public/robots.txt` | the `Sitemap:` line |

DNS and the domain binding itself live in Vercel, outside this repo. The build
passes either way, so a missed record only shows up as a dead link. `brendanlo.com`
is the previous domain and should stay pointed here so old links survive.

## Deploy

Vercel, from `main` (`vercel.json` pins the framework preset). No env vars.

```bash
npm run build   # next build
npm run lint    # eslint
node scripts/verify-tensors.mts
```

## Other files

`githubREADME.md` is a draft of a GitHub *profile* readme (the bio/stats card
version). Nothing on this site reads it; it is kept here as the working copy.

The previous WebGL/editorial design is archived on the `archive/v2-editorial-webgl`
branch.
