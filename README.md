# brendanlo.com

Personal site. One static page: intro, research, papers, projects.

Next.js 16 App Router, no CSS framework, no client components — `src/app/page.tsx`
holds both the content arrays and the markup, `src/app/globals.css` holds every style.

```bash
npm run dev
```

Content lives in the `research` / `papers` / `projects` / `misc` arrays at the top of
`src/app/page.tsx`. The resume PDF is `public/BrendanLo_Resume.pdf`.

The previous WebGL/editorial design is archived on the `archive/v2-editorial-webgl`
branch.
