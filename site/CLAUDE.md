# Vitruvius 2.0 — project steering

## What this is

A port of vitruvius.com.br from a legacy PHP/Joomla stack to an Astro static site backed by a SQLite database migrated from MySQL. The original site lives at `/home/rbrancher/Work/Code/vitruvius/vitruvius_original/`.

## Golden rule: preserve the look and feel

**Any template or layout change must be based on the original implementation.** Before touching a component, inspect its PHP counterpart in `vitruvius_original/` to understand how the original renders it. The goal is a faithful port — same visual design, same interaction model, same information hierarchy — unless the user explicitly asks for a deviation.

- Modernize the code (TypeScript, component boundaries, semantic HTML), but do not redesign.
- Match spacing, typography, colours, and widget behaviour to the original.
- When in doubt, open `vitruvius_original/` and compare.

## Original source layout

| Path | What it contains |
|------|-----------------|
| `vitruvius_original/application/` | Joomla application core |
| `vitruvius_original/modules/` | Joomla modules (sidebars, navs, etc.) |
| `vitruvius_original/media/` | Static assets (images, CSS, JS) |
| `vitruvius_original/index.php` | Entry point |

Magazine templates are typically under `vitruvius_original/modules/` or rendered by Joomla components — browse by magazine slug when looking for a specific layout.

## Architecture

- **Framework**: Astro (static output), TypeScript
- **Database**: SQLite via `better-sqlite3`, migrated from MySQL dump (`migrate.py`)
- **Images**: Cloudflare R2 (`vitruvius-media` bucket), accessed via `imageUrl(src, size)` helper in `src/lib/text.ts`
- **Image sizes**: `grid_1`, `grid_9`, `gallery_thumb`, `originals`, `arqtur_edition`
- **CSS**: single global stylesheet at `src/styles/global.css`; magazine-scoped overrides via `[data-magazine="slug"]` on `<body>`
- **Grid**: 16-column float grid; `unit = 72px` at ≥1200px, `60px` at 1056–1199px

## Magazine-specific behaviour

| Magazine | Special layout |
|----------|---------------|
| `arquiteturismo` | Panoramic banner image (200%-wide, click to pan); 5/2/2 grid columns on edition page |
| `drops` | Filmstrip cover layout (`DropsCapa` component); no standard article gallery |
| `entrevista` | No gallery; paginated via `?page=N` query string (not sub-paths); top nav lists all page titles; bottom nav shows current title + `< N >` prev/next |

## Key files

| File | Role |
|------|------|
| `src/lib/db.ts` | All SQLite queries and TypeScript interfaces |
| `src/lib/text.ts` | `stripHtml`, `processArticleBody`, `imageUrl` |
| `src/layouts/Base.astro` | Shell: universal header, magazine header, footer |
| `src/pages/revistas/browse/[magazine]/[edition].astro` | Edition index page |
| `src/pages/revistas/read/[magazine]/[edition]/[id].astro` | Article page (handles entrevista `?page=N` pagination) |
| `src/pages/revistas/read/[magazine]/[edition]/[id]/[page].astro` | Sub-page for paginated articles (non-entrevista); redirects entrevista to `?page=N` |
| `src/components/DropsCapa.astro` | Drops filmstrip layout |
| `src/components/ArqturBanner.astro` | Arquiteturismo panoramic banner |
| `scripts/server-to-r2.mjs` | SSH-stream images from origin server to R2 (no local copy) |

## Do not

- Add features or abstractions not requested.
- Add comments that describe *what* the code does (names do that).
- Change the visual design without an explicit request.
- Commit without being asked.
