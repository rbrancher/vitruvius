# vitruvius — Astro SSG

Static-site rewrite of [vitruvius.com.br](https://vitruvius.com.br) using [Astro 5](https://astro.build).

## Dev commands

Run from inside `site/`:

| Command           | Action                                     |
| :---------------- | :----------------------------------------- |
| `npm install`     | Install dependencies                       |
| `npm run dev`     | Start dev server at `localhost:4321`       |
| `npm run build`   | Build to `./dist/`                         |
| `npm run preview` | Preview the production build locally       |

## Project layout

```
site/
├── public/                        # Static assets (robots.txt, favicon, etc.)
├── src/
│   ├── components/
│   │   └── ImageGallery.astro     # Slideshow with thumbnails + keyboard nav
│   ├── content/                   # Markdown articles (one dir per magazine)
│   │   ├── config.ts              # Content collection schemas
│   │   ├── arquitextos/           # sample: 4 articles
│   │   ├── arquiteturismo/        # (empty — fill from SQL export)
│   │   ├── drops/
│   │   ├── entrevista/
│   │   ├── minha-cidade/
│   │   ├── projetos/
│   │   └── resenhasonline/
│   ├── data/
│   │   └── magazines.ts           # Magazine metadata (slug, name, ISSN, colour)
│   ├── layouts/
│   │   └── Base.astro             # Full-page shell: header, section nav, footer
│   ├── pages/
│   │   ├── index.astro            # Home — 8 most-recent articles across all magazines
│   │   └── revistas/
│   │       ├── index.astro        # Magazine directory
│   │       ├── browse/[magazine].astro   # Issue listing for one magazine
│   │       └── read/[magazine]/[issue]/[articleId].astro  # Article reader
│   └── styles/
│       └── global.css             # Design system (Courier New, grayscale + accents)
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## Content schema

Each article lives as a `.md` file whose frontmatter satisfies `articleSchema` (`src/content/config.ts`):

```yaml
---
legacyId: 1002          # numeric ID from the legacy PHP system — used in URL
title: "Article title"
subtitle: "Optional subtitle"
issue: "01.001"         # "{year}.{number}" — matches directory-level grouping
authors:
  - name: Author Name
    institution: Optional University
abstract: "Optional abstract text."
tags: [tag1, tag2]
publishedAt: 2000-01-01
images:
  - src: https://vitruvius.com.br/media/images/magazines/year01/img001.jpg
    thumb: https://vitruvius.com.br/media/images/magazines/year01/img001_thumb.jpg
    caption: "Image caption"
coverImage: "https://..."   # optional OG image
pdfUrl: "https://..."       # optional PDF link
---

Article body in Markdown...
```

## URL structure

```
/                                        home (recent articles)
/revistas                                magazine directory
/revistas/browse/{magazine}              issue listing for a magazine
/revistas/read/{magazine}/{issue}/{id}   article reader
```

Mirrors the existing PHP URL scheme so existing links and search-engine rankings are preserved.

## Migration plan

1. Export SQL from the legacy MySQL database.
2. Run a migration script (TBD: `scripts/import-sql.ts`) to convert rows into
   per-article `.md` files under `src/content/{magazine}/`.
3. Run `npm run build` — Astro will generate one static HTML file per article.
4. Deploy the `dist/` directory to any CDN / static host.

## Design system

`global.css` is a faithful reproduction of the original site's visual language:

- Font: **Courier New** throughout, 12 px base / 16 px line-height
- Palette: grayscale (`--black` → `--white`) + per-magazine accent colours
- Layout helpers: `.wrap` (max 980 px), `.rule-one` – `.rule-five`, `.section-nav`, `.magazine-header`, `.revistas-entry`, `.article-body`
