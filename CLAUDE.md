# Vitruvius

Static site (Astro) of vitruvius.com.br, a Brazilian architecture publication
running since 1999. All content is Markdown files in `site/conteudo/`; there
is no database. The layout's goal is fidelity to the original (legacy PHP)
site; most past bugs were layouts drifting away from it.

All code lives in `site/`. Run commands from there.

## Who you are working for

Usually an editor with only basic HTML knowledge, not a developer.

- **Always reply in Brazilian Portuguese**, whatever language these
  instructions are in. Code, commit messages and code comments stay in English.
- Talk in plain language. Describe changes by what readers will see
  ("o título do artigo ficou maior"), not by files or CSS properties.
- For any visual change, show the before/after screenshots and get their
  explicit OK before treating the new look as correct.
- If a request is ambiguous ("deixa mais bonito"), ask one concrete question
  instead of guessing.

## Publishing: how changes reach the live site

Merging into `master` publishes the site automatically
(`.github/workflows/deploy.yml`). So:

- Never push to `master`. Work on a branch and open a pull request.
- Tell the editor in plain words what the pull request changes and that
  merging it puts it on the live site.

## Content: articles, editions, authors

The format is documented for the editor, in Portuguese, in
`site/conteudo/LEIA-ME.md`. Read it before creating or editing content.

- Article: `conteudo/revistas/<revista>/<edição>/<número>.md`. The number is
  the article's id in its URL and must be unique: `npm run conteudo:validar`
  prints the next free one.
- Edition: a folder per edition with an `edicao.md` (date, published flag).
- Author: `conteudo/autores/<slug>.md`; articles refer to it by slug.
- New articles are Markdown. Articles imported from the legacy site have
  `formato: html`; keep their HTML as it is.
- New images go in `site/public/imagens/<ano>/` and are referenced as
  `/imagens/<ano>/arquivo.jpg`. Legacy images are on Cloudflare R2.
- After any content change run `npm run conteudo:validar`; it lists problems
  in Portuguese you can relay to the editor.
- To show the editor a new article: `npm run dev`, open the article URL with
  Playwright, take a screenshot. (The first request is slow: it reads all
  content.)

## Verify every change

```sh
npm run check   # content validation, types, unit tests, sample build, screenshots (~1 min)
```

Do not commit unless it passes, or the only failures are screenshot changes
the editor has approved (see below).

## Visual changes: the screenshot workflow

`tests/visual/pages.spec.ts` screenshots every page type at desktop (1280px),
tablet (900px) and mobile (390px), built from the sample content in
`tests/fixture/conteudo/` (never from the real content, so screenshots only
change when the layout does). The reference images are committed in
`tests/visual/__screenshots__/`.

1. Make the change, run `npm run check`.
2. Failing screenshot tests list the pages that changed. For each one,
   `test-results/` holds `*-expected.png`, `*-actual.png` and `*-diff.png`.
   Look at them yourself first.
3. A page you did not mean to change has changed: that is a regression. Fix it.
4. Show the editor expected vs. actual for the intended changes. Once they
   approve, run `npm run test:visual:update` and commit the new reference
   images together with the code change.

Never run `test:visual:update` just to make tests pass.

When a layout change needs a case the sample lacks (a long title, an article
without images, a new section…), add a file to `tests/fixture/conteudo/` and,
for a new kind of page, an entry to `PAGES` in `tests/visual/pages.spec.ts`.

## Golden rule: preserve the look and feel

**Any template or layout change must be based on the original implementation.**
Before touching a component, inspect its PHP counterpart in the original site
to see how it renders. The goal is a faithful port — same visual design, same
interaction model, same information hierarchy — unless the user explicitly
asks for a deviation.

- Modernize the code (TypeScript, component boundaries, semantic HTML), but do not redesign.
- Match spacing, typography, colours and widget behaviour to the original.
- When in doubt, open the original and compare.

The original (PHP/Joomla) source is on the owner's machine at
`/home/rbrancher/Work/Code/vitruvius/vitruvius_original/`, next to this
repository. It is not available in cloud sessions; if you need it there, say so.

| Path | What it contains |
|------|-----------------|
| `vitruvius_original/application/` | Joomla application core |
| `vitruvius_original/modules/` | Joomla modules (sidebars, navs, etc.) |
| `vitruvius_original/media/` | Static assets (images, CSS, JS) |
| `vitruvius_original/index.php` | Entry point |

Magazine templates are typically under `modules/` or rendered by Joomla
components; browse by magazine slug to find a specific layout.

## Layout notes

- CSS: one global stylesheet, `src/styles/global.css`; magazine-scoped
  overrides via `[data-magazine="slug"]` on `<body>`.
- Grid: 16-column float grid; `unit = 72px` at ≥1200px, `60px` at 1056–1199px.
- Image sizes on R2 (`imageUrl(src, size)` in `src/lib/text.ts`): `grid_1`,
  `grid_9`, `gallery_thumb`, `originals`, `arqtur_edition`.
- Scripts with `define:vars` are inlined as-is, not compiled: plain JavaScript
  only, no TypeScript syntax.

| Magazine | Special layout |
|----------|---------------|
| `arquiteturismo` | Panoramic banner (`ArqturBanner`, image from `banner:` in `edicao.md`; 200%-wide, click to pan); 5/2/2 grid columns on the edition page |
| `drops` | Filmstrip cover layout (`DropsCapa`); no standard article gallery |
| `entrevista` | No gallery; pages switched with `?page=N` on one URL (sub-paths `/N` redirect there); top nav lists all page titles; bottom nav shows current title + `< N >` |

## Do not

- Add features or abstractions not requested.
- Add comments that describe *what* the code does (names do that).
- Change the visual design without an explicit request.

Committing and opening pull requests is part of every change; no need to ask.

## Where things are

| What readers see | File |
|---|---|
| Header, top menu, magazine bar, footer (every page) | `src/layouts/Base.astro` |
| Fonts, colours, spacing, grid, responsive breakpoints | `src/styles/global.css` |
| Article page (page 1, incl. all entrevista pages / pages 2+ of other magazines) | `src/pages/revistas/read/[magazine]/[edition]/[id].astro`, `.../[id]/[page].astro` |
| Edition cover page (drops filmstrip: `src/components/DropsCapa.astro`; arquiteturismo banner: `src/components/ArqturBanner.astro`) | `src/pages/revistas/browse/[magazine]/[edition].astro` |
| List of editions of a magazine | `src/pages/revistas/browse/[magazine].astro` |
| Home (`/revistas`) | `src/pages/revistas/index.astro` |
| Archive, editorial board, submission rules | `src/pages/revistas/{arquivo,expediente,normas}/[magazine].astro` |
| Author page | `src/pages/autor/[slug].astro` |
| Search, about, statistics | `src/pages/pesquisa/index.astro`, `sobre.astro`, `numeros.astro` |
| Article HTML clean-up (images in text, quotes, legacy links) | `src/lib/text.ts` |
| Reading and validating content | `src/lib/content.ts` |
| The seven magazines (names, ISSN, colours) | `src/lib/magazines.ts` |
