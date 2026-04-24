import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DB_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../vitruvius.db'
);

let _db: InstanceType<typeof Database> | null = null;

export function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH, { readonly: true });
    _db.pragma('journal_mode = WAL');
  }
  return _db;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface Magazine {
  id: number;
  title: string;
  issn: string | null;
  status: string | null;
}

export interface Edition {
  id: number;
  magazine_id: number;
  idx: string;
  published_at: number | null;
  status: string | null;
}

export interface Author {
  id: number;
  firstname: string | null;
  lastname: string | null;
  institution: string | null;
  biography: string | null;
  degree: string | null;
  email: string | null;
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
  published_at: number | null;
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

export interface Tag {
  id: number;
  title: string;
}

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

// ── Queries ──────────────────────────────────────────────────────────────────

export function getMagazines(): Magazine[] {
  return getDb().prepare('SELECT * FROM magazines ORDER BY id').all() as Magazine[];
}

export function getMagazineByTitle(title: string): Magazine | null {
  return (getDb().prepare('SELECT * FROM magazines WHERE title = ?').get(title) as Magazine) ?? null;
}

export function getEditionsByMagazine(magazineId: number): Edition[] {
  return getDb()
    .prepare("SELECT * FROM editions WHERE magazine_id = ? AND status IN ('1','2') ORDER BY published_at DESC")
    .all(magazineId) as Edition[];
}

export function getEditionByIdx(magazineId: number, idx: string): Edition | null {
  return (getDb()
    .prepare('SELECT * FROM editions WHERE magazine_id = ? AND idx = ?')
    .get(magazineId, idx) as Edition) ?? null;
}

export function getPublishedArticlesByEdition(editionId: number): ArticleWithMeta[] {
  return getDb().prepare(`
    SELECT
      ar.*,
      m.title  AS magazine_title,
      e.idx    AS edition_idx,
      au.firstname AS author_firstname,
      au.lastname  AS author_lastname,
      au.institution AS author_institution,
      au.slug      AS author_slug,
      ab.abstract  AS abstract
    FROM articles ar
    JOIN magazines m ON ar.magazine_id = m.id
    JOIN editions  e ON ar.edition_id  = e.id
    LEFT JOIN authors au ON ar.author_id = au.id
    LEFT JOIN articleabstracts ab
      ON ab.article_id = ar.id AND ab.language_id = 1
    WHERE ar.edition_id = ? AND ar.status IN ('2','3')
    ORDER BY CAST(ar.idx AS INTEGER)
  `).all(editionId) as ArticleWithMeta[];
}

export function getArticleWithMeta(articleId: number): ArticleWithMeta | null {
  return (getDb().prepare(`
    SELECT
      ar.*,
      m.title  AS magazine_title,
      e.idx    AS edition_idx,
      au.firstname AS author_firstname,
      au.lastname  AS author_lastname,
      au.institution AS author_institution,
      au.slug      AS author_slug,
      ab.abstract  AS abstract
    FROM articles ar
    JOIN magazines m ON ar.magazine_id = m.id
    JOIN editions  e ON ar.edition_id  = e.id
    LEFT JOIN authors au ON ar.author_id = au.id
    LEFT JOIN articleabstracts ab
      ON ab.article_id = ar.id AND ab.language_id = 1
    WHERE ar.id = ?
  `).get(articleId) as ArticleWithMeta) ?? null;
}

const LANG_LABELS: Record<number, string> = { 1: 'português', 2: 'english', 3: 'español', 4: 'italiano' };

export interface ArticleAbstract { language_id: number; label: string; abstract: string; }

export function getArticleAbstracts(articleId: number): ArticleAbstract[] {
  const rows = getDb().prepare(`
    SELECT language_id, abstract FROM articleabstracts
    WHERE article_id = ? AND abstract != ''
    ORDER BY language_id
  `).all(articleId) as { language_id: number; abstract: string }[];
  return rows.map(r => ({ ...r, label: LANG_LABELS[r.language_id] ?? `idioma ${r.language_id}` }));
}

export function getArticlePages(articleId: number): ArticlePage[] {
  return getDb().prepare(`
    SELECT * FROM articlepages
    WHERE article_id = ?
    ORDER BY pagenum ASC NULLS LAST, id ASC
  `).all(articleId) as ArticlePage[];
}

export function getArticleImages(articleId: number): Image[] {
  return getDb().prepare(`
    SELECT i.*, c.caption
    FROM articles_images ai
    JOIN images i ON ai.image_id = i.id
    LEFT JOIN captions c ON c.image_id = i.id AND c.language_id = 1
    WHERE ai.article_id = ?
    ORDER BY i.img_order ASC NULLS LAST
  `).all(articleId) as Image[];
}

export function getEditionCoverImages(editionId: number): Map<number, string> {
  const rows = getDb().prepare(`
    SELECT ai.article_id, i.src
    FROM articles a
    JOIN articles_images ai ON ai.article_id = a.id
    JOIN images i ON i.id = ai.image_id
    WHERE a.edition_id = ? AND i.is_cover = 1
    ORDER BY i.img_order ASC NULLS LAST, i.id ASC
  `).all(editionId) as { article_id: number; src: string }[];
  const map = new Map<number, string>();
  for (const row of rows) {
    if (!map.has(row.article_id)) map.set(row.article_id, row.src);
  }
  return map;
}

export function getArticleTags(articleId: number): Tag[] {
  return getDb().prepare(`
    SELECT t.* FROM articles_tags at_
    JOIN tags t ON at_.tag_id = t.id
    WHERE at_.article_id = ?
    ORDER BY t.title
  `).all(articleId) as Tag[];
}

export function getAuthor(authorId: number): Author | null {
  return (getDb().prepare('SELECT * FROM authors WHERE id = ?').get(authorId) as Author) ?? null;
}

export function getAuthorBySlug(slug: string): Author | null {
  return (getDb().prepare('SELECT * FROM authors WHERE slug = ?').get(slug) as Author) ?? null;
}

export function getArticlesByAuthor(authorId: number): ArticleWithMeta[] {
  return getDb().prepare(`
    SELECT
      ar.*,
      m.title  AS magazine_title,
      e.idx    AS edition_idx,
      au.firstname AS author_firstname,
      au.lastname  AS author_lastname,
      au.institution AS author_institution,
      au.slug      AS author_slug,
      ab.abstract  AS abstract
    FROM articles ar
    JOIN magazines m ON ar.magazine_id = m.id
    JOIN editions  e ON ar.edition_id  = e.id
    LEFT JOIN authors au ON ar.author_id = au.id
    LEFT JOIN articleabstracts ab
      ON ab.article_id = ar.id AND ab.language_id = 1
    WHERE ar.author_id = ? AND ar.status IN ('2','3')
    ORDER BY e.published_at DESC
  `).all(authorId) as ArticleWithMeta[];
}

export function getAllPublishedArticles(): ArticleWithMeta[] {
  return getDb().prepare(`
    SELECT
      ar.*,
      m.title  AS magazine_title,
      e.idx    AS edition_idx,
      au.firstname AS author_firstname,
      au.lastname  AS author_lastname,
      au.institution AS author_institution,
      au.slug      AS author_slug,
      ab.abstract  AS abstract
    FROM articles ar
    JOIN magazines m ON ar.magazine_id = m.id
    JOIN editions  e ON ar.edition_id  = e.id
    LEFT JOIN authors au ON ar.author_id = au.id
    LEFT JOIN articleabstracts ab
      ON ab.article_id = ar.id AND ab.language_id = 1
    WHERE ar.status IN ('2','3')
    ORDER BY e.published_at DESC
  `).all() as ArticleWithMeta[];
}

export function getLatestEditions(limit = 7): (Edition & { magazine_title: string })[] {
  return getDb().prepare(`
    SELECT e.*, m.title AS magazine_title
    FROM editions e
    JOIN magazines m ON e.magazine_id = m.id
    WHERE e.status IN ('1','2')
      AND e.published_at = (
        SELECT MAX(e2.published_at)
        FROM editions e2
        WHERE e2.magazine_id = e.magazine_id AND e2.status IN ('1','2')
      )
    ORDER BY m.id
    LIMIT ?
  `).all(limit) as (Edition & { magazine_title: string })[];
}

export function getAuthorsWithArticles(): Author[] {
  return getDb().prepare(`
    SELECT DISTINCT au.*
    FROM authors au
    JOIN articles ar ON ar.author_id = au.id
    WHERE ar.status IN ('2','3')
      AND au.id != 0
      AND (au.firstname IS NOT NULL OR au.lastname IS NOT NULL)
    ORDER BY au.lastname, au.firstname
  `).all() as Author[];
}

export function authorFullName(a: Pick<Author, 'firstname' | 'lastname'>): string {
  return [a.firstname, a.lastname].filter(Boolean).join(' ');
}
