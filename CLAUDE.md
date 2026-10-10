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

## The original site

The legacy PHP site's source is in `vitruvius_original/`, next to this
repository's folder on the owner's machine (`../vitruvius_original` from the
repository root). It is the reference for how layouts should look. It is not
available in cloud sessions; if you need it there, say so.

## Where things are

| What readers see | File |
|---|---|
| Header, top menu, magazine bar, footer (every page) | `src/layouts/Base.astro` |
| Fonts, colours, spacing, grid, responsive breakpoints | `src/styles/global.css` |
| Article page (page 1 / pages 2+ of projetos) | `src/pages/revistas/read/[magazine]/[edition]/[id].astro`, `.../[id]/[page].astro` |
| Edition cover page (drops: filmstrip in `src/components/DropsCapa.astro`) | `src/pages/revistas/browse/[magazine]/[edition].astro` |
| List of editions of a magazine | `src/pages/revistas/browse/[magazine].astro` |
| Home (`/revistas`) | `src/pages/revistas/index.astro` |
| Archive, editorial board, submission rules | `src/pages/revistas/{arquivo,expediente,normas}/[magazine].astro` |
| Author page | `src/pages/autor/[slug].astro` |
| Search, about, statistics | `src/pages/pesquisa/index.astro`, `sobre.astro`, `numeros.astro` |
| Article HTML clean-up (images in text, quotes, legacy links) | `src/lib/text.ts` |
| Reading and validating content | `src/lib/content.ts` |
| The seven magazines (names, ISSN, colours) | `src/lib/magazines.ts` |
