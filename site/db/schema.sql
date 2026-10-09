-- Schema of vitruvius.db as the site reads it (see src/lib/db.ts).
-- The production database was converted once from the dead legacy site's
-- MySQL dump and later gained `articles.section` and `authors.slug`.
-- tests/fixture uses this file; keep it in sync with the real database
-- (`npm run db:check-schema` compares them).

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
  email       TEXT,
  slug        TEXT
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
  section      TEXT,
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
