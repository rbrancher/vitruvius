/**
 * All site content lives in Markdown files under conteudo/ (see
 * conteudo/LEIA-ME.md for the format). This module reads them once per build
 * and answers the questions the pages ask.
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { z } from 'zod';
import { MAGAZINES } from './magazines';

// Relative to site/, where every command runs. VITRUVIUS_CONTENT points at
// another content folder, e.g. the test sample.
const CONTENT_DIR = path.resolve(process.env.VITRUVIUS_CONTENT ?? 'conteudo');

// ── Types (the shapes the pages use) ─────────────────────────────────────────

export interface Magazine { id: number; title: string; issn: string | null; status: string | null; }

export interface Edition {
  id: number;
  magazine_id: number;
  idx: string;
  published_at: number | null; // unix seconds, noon UTC of the edition date
  status: string | null;
}

export interface Author {
  id: number;
  firstname: string | null;
  lastname: string | null;
  institution: string | null;
  biography: string | null;
  degree: string | null;
  slug: string;
}

export interface Article {
  id: number;
  magazine_id: number;
  edition_id: number;
  author_id: number | null;
  idx: string | null;
  title: string | null;
  subtitle: string | null;
  lead: string | null;
  text: string | null;
  status: string | null;
  section: string | null;
  created_at: number | null;
}

export interface ArticleWithMeta extends Article {
  magazine_title: string;
  edition_idx: string;
  author_firstname: string | null;
  author_lastname: string | null;
  author_institution: string | null;
  author_slug: string | null;
  abstract: string | null;
}

export interface Tag { id: number; title: string; }

export interface ArticlePage {
  id: number;
  article_id: number;
  pagenum: number | null;
  title: string | null;
  location: string | null;
  date: string | null;
  text: string | null;
}

export interface Image {
  id: number;
  src: string | null;
  is_cover: number;
  img_order: number | null;
  source: string | null;
  credit: string | null;
  caption: string | null;
}

// ── File formats ─────────────────────────────────────────────────────────────

// Error messages are read by the editor, so they are in Portuguese.
const errorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_type) {
    if (issue.received === 'undefined') return { message: 'campo obrigatório' };
    const expected: Record<string, string> = { boolean: 'use true ou false', string: 'deve ser um texto', number: 'deve ser um número', array: 'deve ser uma lista' };
    return { message: expected[issue.expected] ?? `tipo inválido (esperado ${issue.expected})` };
  }
  if (issue.code === z.ZodIssueCode.unrecognized_keys) {
    return { message: `campo desconhecido: ${issue.keys.join(', ')} (veja conteudo/LEIA-ME.md)` };
  }
  if (issue.code === z.ZodIssueCode.invalid_enum_value) {
    return { message: `use um destes valores: ${issue.options.join(', ')}` };
  }
  return { message: ctx.defaultError };
};

const text = z.string().nullish();
// YAML turns an unquoted 2024-03-01 into a Date; accept both.
const date = z.union([z.date(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use AAAA-MM-DD')]).nullish()
  .transform(d => (d instanceof Date ? d.toISOString().slice(0, 10) : d ?? null));
const formato = z.enum(['markdown', 'html']).default('markdown');

const AuthorFile = z.object({
  nome: text, sobrenome: text, instituicao: text, titulacao: text, formato,
}).strict();

const EditionFile = z.object({
  data: date,
  publicada: z.boolean().default(true),
  banner: text, // arquiteturismo: panoramic image at the top of the edition
}).strict();

const ImageFile = z.object({
  id: z.number().int().positive(),
  arquivo: z.string(),
  capa: z.boolean().default(false),
  credito: text, fonte: text,
  legenda: text, legenda_en: text, legenda_es: text, legenda_it: text, legenda_fr: text, legenda_ca: text,
}).strict();

const ArticleFile = z.object({
  indice: z.union([z.string(), z.number()]).nullish().transform(v => (v == null ? null : String(v))),
  titulo: text,
  subtitulo: text,
  autor: text,
  secao: text,
  chamada: text,
  data: date,
  data_publicacao: date,
  publicado: z.boolean().default(true),
  formato,
  resumo: text, resumo_en: text, resumo_es: text, resumo_it: text, resumo_fr: text, resumo_ca: text,
  resumo_alternativo: text, // kept from the legacy site, not displayed
  tags: z.array(z.string()).default([]),
  autores_projeto: z.array(z.string()).default([]),
  imagens: z.array(ImageFile).default([]),
  paginas: z.array(z.object({ titulo: text, local: text, data: z.union([z.string(), z.number()]).nullish()
    .transform(v => (v == null ? null : String(v))) }).strict()).default([]),
}).strict().superRefine((a, ctx) => {
  if (a.publicado && !a.titulo) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['titulo'], message: 'campo obrigatório (ou publicado: false)' });
});

export const PAGE_BREAK = /\n?<!--\s*pagina\s*-->\n?/;

// ── Loading ──────────────────────────────────────────────────────────────────

interface Store {
  magazines: Magazine[];
  editions: Edition[];
  authors: Author[];
  articles: Article[];
  abstracts: Map<number, Record<string, string>>;
  tags: Map<number, string[]>;
  images: Map<number, Image[]>;
  pages: Map<number, ArticlePage[]>;
  banners: Map<number, string>;
}

export class ContentError extends Error {}

function readMd<T extends z.ZodTypeAny>(file: string, schema: T): { data: z.output<T>; body: string } {
  let raw: matter.GrayMatterFile<string>;
  try {
    raw = matter(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    const line = (e as { mark?: { line?: number } }).mark?.line;
    throw new ContentError(`${path.relative(process.cwd(), file)}\n  erro de formatação no topo do arquivo` +
      `${line != null ? ` (perto da linha ${line + 1})` : ''}. Dica: textos com dois-pontos (:) ou que começam com aspas ` +
      `devem ficar entre aspas simples, ex. chamada: 'Lisboa: a cidade'`);
  }
  const parsed = schema.safeParse(raw.data, { errorMap });
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `  ${i.path.join('.') || '(arquivo)'}: ${i.message}`).join('\n');
    throw new ContentError(`${path.relative(process.cwd(), file)}\n${issues}`);
  }
  return { data: parsed.data, body: raw.content.trim() };
}

function toTimestamp(d: string | null): number | null {
  if (!d) return null;
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, day, 12) / 1000; // noon UTC: same calendar day in every time zone
}

function render(body: string, fmt: 'markdown' | 'html'): string {
  return fmt === 'html' ? body : (marked.parse(body, { async: false }) as string);
}

const dirs = (p: string) => (fs.existsSync(p) ? fs.readdirSync(p, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort() : []);
const mdFiles = (p: string) => (fs.existsSync(p) ? fs.readdirSync(p).filter(f => f.endsWith('.md')).sort() : []);

function load(): Store {
  const s: Store = {
    magazines: MAGAZINES.map(m => ({ id: m.id, title: m.slug, issn: m.issn, status: '1' })),
    editions: [], authors: [], articles: [],
    abstracts: new Map(), tags: new Map(), images: new Map(), pages: new Map(), banners: new Map(),
  };
  const errors: string[] = [];
  const attempt = (fn: () => void) => {
    try { fn(); } catch (e) { if (e instanceof ContentError) errors.push(e.message); else throw e; }
  };

  // Authors get numeric ids in alphabetical order of their file names.
  const authorId = new Map<string, number>();
  mdFiles(path.join(CONTENT_DIR, 'autores')).forEach((f, i) => attempt(() => {
    const slug = f.slice(0, -3);
    const { data, body } = readMd(path.join(CONTENT_DIR, 'autores', f), AuthorFile);
    authorId.set(slug, i + 1);
    s.authors.push({
      id: i + 1, slug, firstname: data.nome ?? null, lastname: data.sobrenome ?? null,
      institution: data.instituicao ?? null, degree: data.titulacao ?? null,
      biography: body ? render(body, data.formato) : null,
    });
  }));

  let editionId = 0;
  for (const mag of MAGAZINES) {
    const magDir = path.join(CONTENT_DIR, 'revistas', mag.slug);
    for (const idx of dirs(magDir)) {
      const edDir = path.join(magDir, idx);
      const id = ++editionId;
      attempt(() => {
        const edFile = path.join(edDir, 'edicao.md');
        if (!fs.existsSync(edFile)) throw new ContentError(`${path.relative(process.cwd(), edDir)}: falta o arquivo edicao.md`);
        const { data } = readMd(edFile, EditionFile);
        s.editions.push({ id, magazine_id: mag.id, idx, published_at: toTimestamp(data.data), status: data.publicada ? '2' : '0' });
        if (data.banner) s.banners.set(id, data.banner);
      });

      for (const f of mdFiles(edDir)) {
        if (f === 'edicao.md') continue;
        const file = path.join(edDir, f);
        attempt(() => {
          if (!/^\d+\.md$/.test(f)) throw new ContentError(`${path.relative(process.cwd(), file)}: o nome do arquivo deve ser o número do artigo, ex. 1234.md`);
          const articleId = Number(f.slice(0, -3));
          const { data, body } = readMd(file, ArticleFile);
          if (data.autor && !authorId.has(data.autor)) {
            throw new ContentError(`${path.relative(process.cwd(), file)}\n  autor: não existe conteudo/autores/${data.autor}.md`);
          }
          const ids = data.imagens.map(i => i.id);
          const dup = ids.find((id, i) => ids.indexOf(id) !== i);
          if (dup !== undefined) throw new ContentError(`${path.relative(process.cwd(), file)}\n  imagens: o id ${dup} aparece mais de uma vez`);
          const [main, ...extra] = body.split(PAGE_BREAK);
          if (extra.length !== data.paginas.length) {
            throw new ContentError(`${path.relative(process.cwd(), file)}\n  paginas: ${data.paginas.length} na lista, mas ${extra.length} separadores <!-- pagina --> no texto`);
          }
          s.articles.push({
            id: articleId, magazine_id: mag.id, edition_id: id,
            author_id: data.autor ? authorId.get(data.autor)! : null,
            idx: data.indice, title: data.titulo ?? null, subtitle: data.subtitulo ?? null,
            lead: data.chamada ?? null, text: render(main, data.formato),
            status: data.publicado ? '2' : '1', section: data.secao ?? null,
            created_at: toTimestamp(data.data),
          });
          const abs: Record<string, string> = {};
          for (const [k, lang] of [['resumo', 'pt'], ['resumo_en', 'en'], ['resumo_es', 'es'], ['resumo_it', 'it'], ['resumo_fr', 'fr'], ['resumo_ca', 'ca']] as const) {
            if (data[k]) abs[lang] = data[k]!;
          }
          s.abstracts.set(articleId, abs);
          s.tags.set(articleId, [...data.tags].sort());
          s.images.set(articleId, data.imagens.map((im, i) => ({
            id: im.id, src: im.arquivo, is_cover: im.capa ? 1 : 0, img_order: i + 1,
            source: im.fonte ?? null, credit: im.credito ?? null,
            caption: im.legenda == null ? null
              : data.formato === 'html' ? im.legenda : (marked.parseInline(im.legenda, { async: false }) as string),
          })));
          s.pages.set(articleId, data.paginas.map((p, i) => ({
            id: i + 1, article_id: articleId, pagenum: i + 1, title: p.titulo ?? null,
            location: p.local ?? null, date: p.data, text: render(extra[i], data.formato),
          })));
        });
      }
    }
  }

  const seen = new Map<number, number>();
  for (const a of s.articles) seen.set(a.id, (seen.get(a.id) ?? 0) + 1);
  for (const [id, n] of seen) if (n > 1) errors.push(`artigo ${id}: existem ${n} arquivos ${id}.md (o número deve ser único)`);

  if (errors.length) throw new ContentError(`Problemas no conteúdo:\n\n${errors.join('\n\n')}`);
  return s;
}

let _store: Store | null = null;
function store(): Store { return (_store ??= load()); }

/** Loads every file and throws a ContentError listing all problems found. */
export function validateContent(): { authors: number; editions: number; articles: number } {
  _store = null;
  const s = store();
  return { authors: s.authors.length, editions: s.editions.length, articles: s.articles.length };
}

// ── Queries ──────────────────────────────────────────────────────────────────

const isPublishedEdition = (e: Edition) => e.status === '1' || e.status === '2';
const isPublishedArticle = (a: Article) => a.status === '2' || a.status === '3';
const byDateDesc = (x: number | null, y: number | null) => (y ?? -Infinity) - (x ?? -Infinity);
const intIdx = (idx: string | null) => (idx == null ? -Infinity : parseInt(idx, 10) || 0);

function withMeta(a: Article): ArticleWithMeta {
  const s = store();
  const au = a.author_id != null ? s.authors.find(x => x.id === a.author_id) : undefined;
  return {
    ...a,
    magazine_title: s.magazines.find(m => m.id === a.magazine_id)!.title,
    edition_idx: s.editions.find(e => e.id === a.edition_id)!.idx,
    author_firstname: au?.firstname ?? null,
    author_lastname: au?.lastname ?? null,
    author_institution: au?.institution ?? null,
    author_slug: au?.slug ?? null,
    abstract: s.abstracts.get(a.id)?.pt ?? null,
  };
}

const editionDate = (id: number) => store().editions.find(e => e.id === id)?.published_at ?? null;

export function getMagazines(): Magazine[] {
  return store().magazines;
}

export function getMagazineByTitle(title: string): Magazine | null {
  return store().magazines.find(m => m.title === title) ?? null;
}

export function getEditionsByMagazine(magazineId: number): Edition[] {
  return store().editions
    .filter(e => e.magazine_id === magazineId && isPublishedEdition(e))
    .sort((x, y) => byDateDesc(x.published_at, y.published_at) || y.idx.localeCompare(x.idx));
}

export function getEditionByIdx(magazineId: number, idx: string): Edition | null {
  return store().editions.find(e => e.magazine_id === magazineId && e.idx === idx) ?? null;
}

export function getPublishedArticlesByEdition(editionId: number): ArticleWithMeta[] {
  return store().articles
    .filter(a => a.edition_id === editionId && isPublishedArticle(a))
    .sort((x, y) => intIdx(x.idx) - intIdx(y.idx) || x.id - y.id)
    .map(withMeta);
}

export function getArticleWithMeta(articleId: number): ArticleWithMeta | null {
  const a = store().articles.find(x => x.id === articleId);
  return a ? withMeta(a) : null;
}

const LANGS = ['pt', 'en', 'es', 'it', 'fr', 'ca'] as const;
const LANG_LABELS: Record<string, string> = { pt: 'português', en: 'english', es: 'español', it: 'italiano', fr: 'français', ca: 'català' };

export interface ArticleAbstract { language_id: number; label: string; abstract: string; }

export function getArticleAbstracts(articleId: number): ArticleAbstract[] {
  const abs = store().abstracts.get(articleId) ?? {};
  return LANGS
    .filter(l => abs[l])
    .map(l => ({ language_id: LANGS.indexOf(l) + 1, label: LANG_LABELS[l], abstract: abs[l] }));
}

export function getArticlePages(articleId: number): ArticlePage[] {
  return store().pages.get(articleId) ?? [];
}

export function getArticleImages(articleId: number): Image[] {
  return store().images.get(articleId) ?? [];
}

export function getEditionBannerImage(editionId: number): string | null {
  return store().banners.get(editionId) ?? null;
}

export function getEditionCoverImages(editionId: number): Map<number, string> {
  const map = new Map<number, string>();
  for (const a of store().articles.filter(x => x.edition_id === editionId)) {
    const cover = getArticleImages(a.id).find(i => i.is_cover && i.src);
    if (cover) map.set(a.id, cover.src!);
  }
  return map;
}

export function getArticleTags(articleId: number): Tag[] {
  return (store().tags.get(articleId) ?? []).map((title, i) => ({ id: i + 1, title }));
}

export function getAuthor(authorId: number): Author | null {
  return store().authors.find(a => a.id === authorId) ?? null;
}

export function getAuthorBySlug(slug: string): Author | null {
  return store().authors.find(a => a.slug === slug) ?? null;
}

export function getArticlesByAuthor(authorId: number): ArticleWithMeta[] {
  return store().articles
    .filter(a => a.author_id === authorId && isPublishedArticle(a))
    .sort((x, y) => byDateDesc(editionDate(x.edition_id), editionDate(y.edition_id)))
    .map(withMeta);
}

export function getAllPublishedArticles(): ArticleWithMeta[] {
  return store().articles
    .filter(isPublishedArticle)
    .sort((x, y) => byDateDesc(editionDate(x.edition_id), editionDate(y.edition_id)))
    .map(withMeta);
}

export function getLatestEditions(limit = 7): (Edition & { magazine_title: string })[] {
  const out: (Edition & { magazine_title: string })[] = [];
  for (const m of store().magazines) {
    const eds = store().editions.filter(e => e.magazine_id === m.id && isPublishedEdition(e));
    const max = Math.max(...eds.map(e => e.published_at ?? -Infinity));
    for (const e of eds) if (e.published_at === max) out.push({ ...e, magazine_title: m.title });
  }
  return out.slice(0, limit);
}

export function getAuthorsWithArticles(): Author[] {
  const s = store();
  const ids = new Set(s.articles.filter(isPublishedArticle).map(a => a.author_id));
  const key = (a: Author) => [a.lastname ?? '', a.firstname ?? ''];
  return s.authors
    .filter(a => ids.has(a.id) && (a.firstname || a.lastname))
    .sort((x, y) => { const [a, b] = [key(x), key(y)]; return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0; });
}

/** Every article (published or not) with its edition, for statistics. */
export function getAllArticles(): ArticleWithMeta[] {
  return store().articles.map(withMeta);
}

export function getAllEditions(): Edition[] {
  return store().editions;
}

export function countImages(): number {
  let n = 0;
  for (const imgs of store().images.values()) n += imgs.length;
  return n;
}

export function authorFullName(a: Pick<Author, 'firstname' | 'lastname'>): string {
  return [a.firstname, a.lastname].filter(Boolean).join(' ');
}

/** The next free article number, for new articles. */
export function nextArticleId(): number {
  return Math.max(0, ...store().articles.map(a => a.id)) + 1;
}
