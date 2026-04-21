# Vitruvius 2.0

Static site rebuild of [Vitruvius](https://vitruvius.com.br), a Brazilian architecture and urbanism publication active since 1999. The original site runs on a legacy PHP/Kohana stack; this version is a full reimplementation as a statically generated site built with Astro.

## Architecture

- **Framework**: [Astro](https://astro.build) — all pages are statically generated at build time
- **Data**: SQLite database (`vitruvius.db`, not tracked in git) built from the original site's data export via `scripts/build-db.mjs`
- **Images**: served from external storage (Cloudflare R2), not tracked in git
- **Styling**: custom CSS grid system (12-column, 4 responsive breakpoints) matching the original site's visual language

## Publications

The site covers seven magazines:

| Slug | Title |
|---|---|
| `arquitextos` | arquitextos |
| `arquiteturismo` | arquiteturismo |
| `drops` | drops |
| `minhacidade` | minha cidade |
| `entrevista` | entrevista |
| `projetos` | projetos |
| `resenhasonline` | resenhas online |

## Project structure

```
site/
├── public/              # Static assets (logos, favicons); media/ excluded from git
├── scripts/
│   └── build-db.mjs     # Imports original data dump into vitruvius.db
├── src/
│   ├── components/      # Shared Astro components (ArticleGallery, etc.)
│   ├── layouts/         # Base layout
│   ├── lib/
│   │   ├── db.ts        # SQLite queries (better-sqlite3)
│   │   └── text.ts      # HTML processing, image URL helpers
│   ├── pages/
│   │   ├── index.astro
│   │   ├── autor/       # Author profile pages
│   │   ├── pesquisa/    # Full-text search
│   │   └── revistas/    # Magazine browsing and article reading
│   └── styles/
│       └── global.css
└── package.json
```

## Setup

The database and media files are not included in this repository. To run the site locally you need both.

```sh
npm install
npm run dev       # dev server at localhost:4321
npm run build     # static build to dist/
npm run preview   # preview the build locally
```
