# Vitruvius

Static rebuild (Astro) of vitruvius.com.br, a Brazilian architecture publication.
The goal of the layout is fidelity to the original (legacy PHP) site. Most past
bugs were layouts drifting away from it.

All code lives in `site/`. Run commands from there.

## Who you are working for

Usually an editor with only basic HTML knowledge, not a developer. So:

- Talk in plain language. Describe changes by what readers will see
  ("the article title is now bigger"), not by files or CSS properties.
- For any visual change, show the before/after screenshots and get their
  explicit OK before treating the new look as correct.
- If a request is ambiguous ("make it nicer"), ask one concrete question
  instead of guessing.
- Never deploy. Publishing to the live site is done by the owner.

## Verify every change

```sh
npm run check   # types, unit tests, sample-data build, screenshot tests (~1 min)
```

Do not commit unless it passes, or the only failures are screenshot changes
the editor has approved (see below).

## Visual changes: the screenshot workflow

`tests/visual/pages.spec.ts` screenshots every page type at desktop (1280px),
tablet (900px) and mobile (390px). The reference images are committed in
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

## Where things are

| What readers see | File |
|---|---|
| Header, top menu, magazine bar, footer (every page) | `src/layouts/Base.astro` |
| Fonts, colours, spacing, grid, responsive breakpoints | `src/styles/global.css` |
| Article page (page 1 / pages 2+ of projetos) | `src/pages/revistas/read/[magazine]/[edition]/[id].astro`, `.../[id]/[page].astro` |
| Edition cover page | `src/pages/revistas/browse/[magazine]/[edition].astro` |
| List of editions of a magazine | `src/pages/revistas/browse/[magazine].astro` |
| Home (`/revistas`) | `src/pages/revistas/index.astro` |
| Archive, editorial board, submission rules | `src/pages/revistas/{arquivo,expediente,normas}/[magazine].astro` |
| Author page | `src/pages/autor/[slug].astro` |
| Search, about, statistics | `src/pages/pesquisa/index.astro`, `sobre.astro`, `numeros.astro` |
| Article HTML clean-up (images in text, quotes, legacy links) | `src/lib/text.ts` |
| Database queries | `src/lib/db.ts` |

Magazine colours: `MAG_COLORS` in `numeros.astro` and `[data-magazine]` rules in `global.css`.

## Data

- Content comes from `vitruvius.db` (SQLite), converted once from the dead
  legacy site's MySQL dump. It is **not in git** and the dump will never be
  rebuilt (`scripts/build-db.mjs` is kept only as history).
- Tests, CI and cloud sessions use a small sample database instead:
  `db/schema.sql` + `db/fixture.sql` → `vitruvius.fixture.db` (`npm run db:fixture`).
  Set `VITRUVIUS_DB=<path>` to point the site at any database.
- Sample builds go to `dist-fixture/`; the real build goes to `dist/`.
- When a change needs a case the sample data lacks (a new section, a long
  title, an article without images…), add rows to `db/fixture.sql` and, for a
  new kind of page, an entry to `PAGES` in `tests/visual/pages.spec.ts`.
- If the real database's columns change, update `db/schema.sql` too
  (`npm run db:check-schema` on a machine with the real database compares them).

Images are on Cloudflare R2 (`imageUrl()` in `src/lib/text.ts`). Screenshot
tests replace them with a grey placeholder.

## Publishing new articles and editions

Not set up yet: new content would have to be written into `vitruvius.db`,
which only the owner has. If asked, explain this and do not invent a workflow.
