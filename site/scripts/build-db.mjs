/**
 * Converts the vitruvius MySQL dump to a SQLite database for use at build time.
 * Run once (or whenever the dump is updated): node scripts/build-db.mjs
 *
 * Output: vitruvius.db in the site root
 */

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DUMP_PATH = path.resolve(__dirname, '../../../vitruvius_dump-2026-04-19.sql');
const DB_PATH = path.resolve(__dirname, '../vitruvius.db');

if (!fs.existsSync(DUMP_PATH)) {
  console.error(`Dump not found at ${DUMP_PATH}`);
  process.exit(1);
}

if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('synchronous = OFF');
db.pragma('foreign_keys = OFF');

// ── Schema ──────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE magazines (
    id        INTEGER PRIMARY KEY,
    title     TEXT NOT NULL,
    issn      TEXT,
    status    TEXT
  );

  CREATE TABLE editions (
    id           INTEGER PRIMARY KEY,
    magazine_id  INTEGER NOT NULL,
    idx          TEXT NOT NULL,
    published_at INTEGER,
    status       TEXT,
    FOREIGN KEY (magazine_id) REFERENCES magazines(id)
  );
  CREATE INDEX editions_magazine ON editions(magazine_id);
  CREATE INDEX editions_idx ON editions(idx);

  CREATE TABLE authors (
    id          INTEGER PRIMARY KEY,
    firstname   TEXT,
    lastname    TEXT,
    institution TEXT,
    biography   TEXT,
    degree      TEXT,
    email       TEXT
  );

  CREATE TABLE articles (
    id           INTEGER PRIMARY KEY,
    magazine_id  INTEGER NOT NULL,
    edition_id   INTEGER NOT NULL,
    author_id    INTEGER,
    idx          TEXT,
    title        TEXT,
    subtitle     TEXT,
    lead         TEXT,
    text         TEXT,
    status       TEXT,
    created_at   INTEGER,
    published_at INTEGER,
    FOREIGN KEY (magazine_id) REFERENCES magazines(id),
    FOREIGN KEY (edition_id)  REFERENCES editions(id),
    FOREIGN KEY (author_id)   REFERENCES authors(id)
  );
  CREATE INDEX articles_edition  ON articles(edition_id);
  CREATE INDEX articles_magazine ON articles(magazine_id);
  CREATE INDEX articles_author   ON articles(author_id);

  -- articleabstracts: id, article_id, abstract, language_id
  -- We keep only language_id=1 (Portuguese) to avoid duplication
  CREATE TABLE articleabstracts (
    id          INTEGER PRIMARY KEY,
    article_id  INTEGER NOT NULL,
    language_id INTEGER NOT NULL,
    abstract    TEXT,
    FOREIGN KEY (article_id) REFERENCES articles(id)
  );
  CREATE INDEX abstracts_article ON articleabstracts(article_id);

  -- articlepages: used by projetos magazine (structured project pages)
  -- columns: id, article_id, title, subtitle, project_title, project_subtitle,
  --          location, date, text, font, font_location, pagenum
  CREATE TABLE articlepages (
    id          INTEGER PRIMARY KEY,
    article_id  INTEGER NOT NULL,
    pagenum     INTEGER,
    title       TEXT,
    location    TEXT,
    date        TEXT,
    text        TEXT,
    FOREIGN KEY (article_id) REFERENCES articles(id)
  );
  CREATE INDEX articlepages_article ON articlepages(article_id);

  CREATE TABLE tags (
    id    INTEGER PRIMARY KEY,
    title TEXT NOT NULL
  );

  CREATE TABLE articles_tags (
    article_id INTEGER NOT NULL,
    tag_id     INTEGER NOT NULL,
    PRIMARY KEY (article_id, tag_id)
  );
  CREATE INDEX articles_tags_tag ON articles_tags(tag_id);

  -- projectauthors: architects/authors credited on projetos articles
  CREATE TABLE projectauthors (
    id        INTEGER PRIMARY KEY,
    firstname TEXT,
    lastname  TEXT,
    email     TEXT
  );

  CREATE TABLE articles_projectauthors (
    article_id       INTEGER NOT NULL,
    projectauthor_id INTEGER NOT NULL,
    PRIMARY KEY (article_id, projectauthor_id)
  );

  -- images: id, filename, fileext, filepath, is_cover, status, order, source, credit
  -- src = filepath || '/' || filename  (e.g. media/images/magazines/0022_operaov6.jpg)
  CREATE TABLE images (
    id       INTEGER PRIMARY KEY,
    src      TEXT,
    is_cover INTEGER,
    img_order INTEGER,
    source   TEXT,
    credit   TEXT
  );

  CREATE TABLE articles_images (
    article_id INTEGER NOT NULL,
    image_id   INTEGER NOT NULL,
    PRIMARY KEY (article_id, image_id)
  );
  CREATE INDEX articles_images_article ON articles_images(article_id);

  -- captions: id, image_id, language_id, caption
  CREATE TABLE captions (
    id          INTEGER PRIMARY KEY,
    image_id    INTEGER NOT NULL,
    language_id INTEGER NOT NULL,
    caption     TEXT,
    FOREIGN KEY (image_id) REFERENCES images(id)
  );
  CREATE INDEX captions_image ON captions(image_id);
`);

// ── Parsing helpers ──────────────────────────────────────────────────────────

function parseValues(line) {
  const match = line.match(/^INSERT INTO `\w+` VALUES (.+?);?\s*$/s);
  if (!match) return [];
  const raw = match[1].trim();
  const rows = [];
  let depth = 0, inStr = false, escape = false, buf = '';

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (escape) { buf += ch; escape = false; continue; }
    if (ch === '\\') { buf += ch; escape = true; continue; }
    if (ch === "'" && !escape) { inStr = !inStr; buf += ch; continue; }
    if (inStr) { buf += ch; continue; }
    if (ch === '(' && depth === 0) { depth++; buf = ''; continue; }
    if (ch === '(') { depth++; buf += ch; continue; }
    if (ch === ')') {
      depth--;
      if (depth === 0) { rows.push(buf); buf = ''; continue; }
      buf += ch; continue;
    }
    buf += ch;
  }
  return rows;
}

function splitRow(row) {
  const fields = [];
  let inStr = false, escape = false, cur = '';
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (escape) { cur += ch; escape = false; continue; }
    if (ch === '\\') { escape = true; cur += ch; continue; }
    if (ch === "'" && !inStr) { inStr = true; cur += ch; continue; }
    if (ch === "'" && inStr) { inStr = false; cur += ch; continue; }
    if (inStr) { cur += ch; continue; }
    if (ch === ',') { fields.push(cur); cur = ''; continue; }
    cur += ch;
  }
  fields.push(cur);
  return fields.map(f => {
    f = f.trim();
    if (f === 'NULL') return null;
    if (f.startsWith("'") && f.endsWith("'")) {
      return f.slice(1, -1)
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, '\\')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t');
    }
    return isNaN(f) ? f : Number(f);
  });
}

// ── Insert helpers ──────────────────────────────────────────────────────────

console.log('Reading dump…');
const dump = fs.readFileSync(DUMP_PATH, 'utf8');
const lines = dump.split('\n');

function getTableLines(tableName) {
  return lines.filter(l => l.startsWith(`INSERT INTO \`${tableName}\``));
}

function insertAll(tableName, handler) {
  let count = 0;
  for (const line of getTableLines(tableName)) {
    for (const row of parseValues(line)) {
      handler(splitRow(row));
      count++;
    }
  }
  console.log(`  ${tableName}: ${count} rows`);
}

// ── Data insertion ──────────────────────────────────────────────────────────

const inserts = {
  magazines: db.prepare('INSERT OR IGNORE INTO magazines VALUES (?,?,?,?)'),
  editions:  db.prepare('INSERT OR IGNORE INTO editions VALUES (?,?,?,?,?)'),
  authors:   db.prepare('INSERT OR IGNORE INTO authors VALUES (?,?,?,?,?,?,?)'),
  articles:  db.prepare('INSERT OR IGNORE INTO articles VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'),
  abstracts: db.prepare('INSERT OR IGNORE INTO articleabstracts VALUES (?,?,?,?)'),
  pages:     db.prepare('INSERT OR IGNORE INTO articlepages VALUES (?,?,?,?,?,?,?)'),
  tags:      db.prepare('INSERT OR IGNORE INTO tags VALUES (?,?)'),
  art_tags:  db.prepare('INSERT OR IGNORE INTO articles_tags VALUES (?,?)'),
  projauth:  db.prepare('INSERT OR IGNORE INTO projectauthors VALUES (?,?,?,?)'),
  art_pa:    db.prepare('INSERT OR IGNORE INTO articles_projectauthors VALUES (?,?)'),
  images:    db.prepare('INSERT OR IGNORE INTO images VALUES (?,?,?,?,?,?)'),
  art_img:   db.prepare('INSERT OR IGNORE INTO articles_images VALUES (?,?)'),
  captions:  db.prepare('INSERT OR IGNORE INTO captions VALUES (?,?,?,?)'),
};

console.log('Inserting data…');

db.transaction(() => {
  // magazines: id, title, issn, language_id, status, created_at, creator
  insertAll('magazines', ([id, title, issn, language_id, status]) =>
    inserts.magazines.run(id, title, issn, status));

  // editions: id, magazine_id, index, legend, created_at, creator, updated_at, updator, published_at, status
  insertAll('editions', ([id, magazine_id, idx, legend, created_at, creator, updated_at, updator, published_at, status]) =>
    inserts.editions.run(id, magazine_id, idx, published_at, status));

  // authors: id, firstname, lastname, birthdate, email, biography, degree, institution, user_id, is_author
  insertAll('authors', ([id, firstname, lastname, birthdate, email, biography, degree, institution]) =>
    inserts.authors.run(id, firstname, lastname, institution, biography, degree, email));

  // articles: id, author_id, co_authors, magazine_id, edition_id, index, section, title,
  //           first_page_title, short_title, subtitle, lead, text, isbn, comment,
  //           status, created_at, creator, updated_at, updator
  insertAll('articles', ([id, author_id, co_authors, magazine_id, edition_id, idx, section, title,
    first_page_title, short_title, subtitle, lead, text, isbn, comment, status, created_at]) =>
    inserts.articles.run(id, magazine_id, edition_id, author_id, idx, title, subtitle, lead, text,
      status, created_at, null));

  // articleabstracts: id, article_id, abstract, language_id
  insertAll('articleabstracts', ([id, article_id, abstract, language_id]) =>
    inserts.abstracts.run(id, article_id, language_id, abstract));

  // articlepages: id, article_id, title, subtitle, project_title, project_subtitle,
  //               location, date, text, font, font_location, pagenum
  insertAll('articlepages', ([id, article_id, title, subtitle, project_title, project_subtitle,
    location, date, text, font, font_location, pagenum]) =>
    inserts.pages.run(id, article_id, pagenum, title, location, date, text));

  // tags: id, title
  insertAll('tags', ([id, title]) => inserts.tags.run(id, title));

  // articles_tags: article_id, tag_id
  insertAll('articles_tags', ([article_id, tag_id]) => inserts.art_tags.run(article_id, tag_id));

  // projectauthors: id, firstname, lastname, birthdate, deathdate, biography, email, phone, ...
  insertAll('projectauthors', ([id, firstname, lastname, birthdate, deathdate, biography, email]) =>
    inserts.projauth.run(id, firstname, lastname, email));

  // articles_projectauthors: article_id, projectauthor_id
  insertAll('articles_projectauthors', ([article_id, pa_id]) => inserts.art_pa.run(article_id, pa_id));

  // images: id, filename, fileext, filepath, is_cover, status, order, source, credit
  insertAll('images', ([id, filename, fileext, filepath, is_cover, status, order, source, credit]) =>
    inserts.images.run(id, filepath ? `${filepath}/${filename}` : filename,
      is_cover === '1' ? 1 : 0, order, source, credit));

  // articles_images: article_id, image_id
  insertAll('articles_images', ([article_id, image_id]) => inserts.art_img.run(article_id, image_id));

  // captions: id, image_id, language_id, caption
  insertAll('captions', ([id, image_id, language_id, caption]) =>
    inserts.captions.run(id, image_id, language_id, caption));
})();

db.close();
console.log(`\nDone → ${DB_PATH}`);
