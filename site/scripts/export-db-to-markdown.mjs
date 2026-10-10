/**
 * ONE-TIME MIGRATION: converts vitruvius.db (the import of the legacy site)
 * into the Markdown files in conteudo/ that the site reads from now on.
 *
 *   node scripts/export-db-to-markdown.mjs [vitruvius.db] [conteudo]
 *
 * Writes:
 *   conteudo/autores/<slug>.md
 *   conteudo/revistas/<revista>/<edição>/edicao.md
 *   conteudo/revistas/<revista>/<edição>/<id do artigo>.md
 *
 * Nothing is lost except author e-mails, which must not go into a public
 * repository. Article bodies keep their original HTML (`formato: html`).
 */

import Database from 'better-sqlite3';
import matter from 'gray-matter';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.resolve(process.argv[2] ?? path.join(root, 'vitruvius.db'));
const outDir = path.resolve(process.argv[3] ?? path.join(root, 'conteudo'));

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found: ${dbPath}`);
  process.exit(1);
}
if (['autores', 'revistas'].some(d => fs.existsSync(path.join(outDir, d)))) {
  console.error(`${outDir} already has content; refusing to overwrite.`);
  process.exit(1);
}

const db = new Database(dbPath, { readonly: true });
// Legacy `languages` table. Caption rows with language 0 are not a language:
// the old system split captions at '|' and filed the rest under 0.
const LANGS = { 1: '', 2: '_en', 3: '_es', 4: '_it', 5: '_fr', 6: '_ca' };

// The legacy site was Brazilian: a timestamp's calendar date is the São Paulo one.
const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' });
const toDate = ts => (ts ? dateFmt.format(new Date(Number(ts) * 1000)) : undefined);

// Drop null/empty values so files only show what is set.
function clean(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

function write(file, data, body = '') {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, matter.stringify(body ? `\n${body.trim()}\n` : '', clean(data)));
}

const counts = { autores: 0, edicoes: 0, artigos: 0, imagens: 0 };
const untitled = [];

// ── Authors ──────────────────────────────────────────────────────────────────
const authorSlug = new Map();
for (const a of db.prepare('SELECT * FROM authors').all()) {
  if (a.id === 0 || !a.slug || !(a.firstname || a.lastname)) continue;
  authorSlug.set(a.id, a.slug);
  write(path.join(outDir, 'autores', `${a.slug}.md`), {
    nome: a.firstname,
    sobrenome: a.lastname,
    instituicao: a.institution,
    titulacao: a.degree,
    formato: a.biography ? 'html' : undefined,
  }, a.biography ?? '');
  counts.autores++;
}

// ── Editions ─────────────────────────────────────────────────────────────────
const magazines = new Map(db.prepare('SELECT id, title FROM magazines').all().map(m => [m.id, m.title]));
const hasTable = name => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?").get(name);
const bannerOf = hasTable('editions_images')
  ? db.prepare('SELECT i.src FROM editions_images x JOIN images i ON i.id = x.image_id WHERE x.edition_id = ? LIMIT 1')
  : null;
const editionDir = new Map();
for (const e of db.prepare('SELECT * FROM editions').all()) {
  const dir = path.join(outDir, 'revistas', magazines.get(e.magazine_id), e.idx);
  editionDir.set(e.id, dir);
  write(path.join(dir, 'edicao.md'), {
    data: toDate(e.published_at),
    publicada: e.status === '1' || e.status === '2',
    banner: bannerOf?.get(e.id)?.src,
  });
  counts.edicoes++;
}

// ── Articles ─────────────────────────────────────────────────────────────────
const q = {
  abstracts: db.prepare("SELECT language_id, abstract FROM articleabstracts WHERE article_id = ? AND abstract != ''"),
  tags: db.prepare('SELECT t.title FROM articles_tags x JOIN tags t ON t.id = x.tag_id WHERE x.article_id = ? ORDER BY t.title'),
  projectAuthors: db.prepare(`SELECT p.firstname, p.lastname FROM articles_projectauthors x
    JOIN projectauthors p ON p.id = x.projectauthor_id WHERE x.article_id = ? ORDER BY p.id`),
  images: db.prepare(`SELECT i.* FROM articles_images x JOIN images i ON i.id = x.image_id
    WHERE x.article_id = ? ORDER BY i.img_order IS NULL, i.img_order, i.id`),
  captions: db.prepare("SELECT language_id, caption FROM captions WHERE image_id = ? AND caption != '' ORDER BY id"),
  pages: db.prepare('SELECT * FROM articlepages WHERE article_id = ? ORDER BY pagenum IS NULL, pagenum, id'),
};

for (const a of db.prepare('SELECT * FROM articles ORDER BY id').all()) {
  const dir = editionDir.get(a.edition_id);
  if (!dir) { console.warn(`article ${a.id}: edition ${a.edition_id} missing, skipped`); continue; }

  const data = {
    indice: a.idx,
    titulo: a.title,
    subtitulo: a.subtitle,
    autor: authorSlug.get(a.author_id),
    secao: a.section,
    chamada: a.lead,
    data: toDate(a.created_at),
    data_publicacao: toDate(a.published_at),
    publicado: (a.status === '2' || a.status === '3') && !!a.title,
    formato: 'html',
  };
  if (!a.title) untitled.push(path.relative(outDir, path.join(dir, `${a.id}.md`)));
  for (const r of q.abstracts.all(a.id)) {
    if (!(r.language_id in LANGS)) throw new Error(`article ${a.id}: unknown abstract language ${r.language_id}`);
    data[`resumo${LANGS[r.language_id]}`] = r.abstract;
  }
  data.tags = q.tags.all(a.id).map(t => t.title);
  data.autores_projeto = q.projectAuthors.all(a.id).map(p => [p.firstname, p.lastname].filter(Boolean).join(' '));

  data.imagens = q.images.all(a.id).map(i => {
    counts.imagens++;
    const img = { id: i.id, arquivo: i.src, capa: i.is_cover ? true : undefined, credito: i.credit, fonte: i.source };
    const caps = q.captions.all(i.id);
    const pt = caps.filter(c => c.language_id === 1 || c.language_id === 0).map(c => c.caption);
    if (pt.length) img.legenda = pt.join('|');
    for (const c of caps) {
      if (c.language_id === 1 || c.language_id === 0) continue;
      if (!(c.language_id in LANGS)) throw new Error(`image ${i.id}: unknown caption language ${c.language_id}`);
      img[`legenda${LANGS[c.language_id]}`] = c.caption;
    }
    return clean(img);
  });

  // projetos: extra pages follow the main text, separated by <!-- pagina -->
  const pages = q.pages.all(a.id);
  data.paginas = pages.map(p => clean({ titulo: p.title, local: p.location, data: p.date }));
  const body = [a.text ?? '', ...pages.map(p => p.text ?? '')].join('\n\n<!-- pagina -->\n\n');

  write(path.join(dir, `${a.id}.md`), data, body);
  counts.artigos++;
}

console.log(`Exported to ${outDir}:`, counts);
if (untitled.length) {
  console.log(`\n${untitled.length} article(s) without a title, exported as drafts (publicado: false):`);
  for (const f of untitled) console.log(`  ${f}`);
}
