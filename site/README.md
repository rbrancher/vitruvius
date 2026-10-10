# Vitruvius 2.0

Static site rebuild of [Vitruvius](https://vitruvius.com.br), a Brazilian architecture and urbanism publication active since 1999. The original site runs on a legacy PHP/Kohana stack; this version is a full reimplementation as a statically generated site built with Astro.

## Architecture

- **Framework**: [Astro](https://astro.build) — all pages are statically generated at build time
- **Content**: Markdown files in `conteudo/` (articles, editions, authors); format in `conteudo/LEIA-ME.md`
- **Images**: legacy images on Cloudflare R2; new ones in `public/imagens/`
- **Deploy**: every merge to `master` publishes to Cloudflare Pages (`.github/workflows/deploy.yml`)
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
├── conteudo/            # All content, as Markdown (see conteudo/LEIA-ME.md)
├── public/              # Static assets (logos, favicons, imagens/)
├── scripts/             # One-time DB export, R2 media upload
├── src/
│   ├── components/      # Shared Astro components (ArticleGallery, DropsCapa)
│   ├── layouts/         # Base layout
│   ├── lib/
│   │   ├── content.ts   # Reads and validates conteudo/
│   │   ├── magazines.ts # The seven magazines
│   │   └── text.ts      # HTML processing, image URL helpers
│   ├── pages/           # autor/, pesquisa/, revistas/ …
│   └── styles/global.css
└── tests/
    ├── fixture/conteudo # Small sample content used by tests and screenshots
    ├── unit/            # Vitest
    └── visual/          # Playwright screenshot tests
```

## Setup

```sh
npm install
npx playwright install chromium   # once per machine: browser for the screenshot tests
npm run dev               # dev server at localhost:4321
npm run build             # static build to dist/
npm run conteudo:validar  # check the content files
npm run check             # validation, types, unit tests, sample build, screenshots
npm run test:visual:update   # accept intended visual changes (review them first)
```

See `../CLAUDE.md` for the change workflow.
