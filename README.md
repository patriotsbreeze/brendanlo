# brendanlo.com

Personal site. One static page: name, links, bio, highlights, takes.

Next.js 16 App Router, no CSS framework, no client components, no `next/font` —
the page is a single column of text on the system UI stack.

```bash
npm run dev
```

## Layout

| Path | What's in it |
| :--- | :--- |
| `src/app/page.tsx` | The whole page. Content is inline JSX, not data arrays — edit the copy in place. |
| `src/app/globals.css` | Every style. ~160 lines, no CSS modules, locked to light via `color-scheme: light`. |
| `src/app/layout.tsx` | Metadata, OpenGraph/Twitter cards, and the `Person` JSON-LD block. |
| `src/app/icon.png`, `apple-icon.png` | Favicon and touch icon (headshot). |
| `public/BrendanLo_Resume.pdf` | Resume, linked from the top row. |
| `public/robots.txt`, `sitemap.xml` | Hand-written; `sitemap.xml` has a `lastmod` to bump. |

The description string is shared between `metadata` and the JSON-LD in
`layout.tsx` — change `DESCRIPTION` once and both follow. Everything else in the
page copy lives only in `page.tsx`.

The email is written out as a decoy string with a working `mailto` underneath, in
`page.tsx` only.

## Deploy

Vercel, from `main` (`vercel.json` pins the framework preset). No env vars, no
build config in `next.config.ts`.

```bash
npm run build   # next build
npm run lint    # eslint
```

## Other files

`githubREADME.md` is a draft of a GitHub *profile* readme (the bio/stats card
version). Nothing on this site reads it; it is kept here as the working copy.

The previous WebGL/editorial design is archived on the `archive/v2-editorial-webgl`
branch.
