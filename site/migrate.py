#!/usr/bin/env python3
"""
Rebuild vitruvius.db from a MySQL dump.
Usage: python3 migrate.py [dump.sql] [output.db]
"""
import re
import sqlite3
import sys
import os
import unicodedata

DUMP = sys.argv[1] if len(sys.argv) > 1 else 'vitruvius_dump-2026-04-25.sql'
DB   = sys.argv[2] if len(sys.argv) > 2 else 'vitruvius.db'


# ── Slug generation ──────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    if not text:
        return ''
    text = text.strip()
    # Normalize accents
    nfkd = unicodedata.normalize('NFKD', text)
    text = ''.join(c for c in nfkd if not unicodedata.combining(c))
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'[\s]+', '-', text)
    text = re.sub(r'-+', '-', text).strip('-')
    return text


# ── MySQL INSERT parser ───────────────────────────────────────────────────────

def parse_insert_values(insert_sql: str):
    """
    Parse MySQL multi-row INSERT INTO `tbl` VALUES (...),(...),...;
    Returns list of tuples of raw Python values (str, int, None).
    """
    # Strip everything up to the first (
    m = re.search(r'VALUES\s*', insert_sql, re.IGNORECASE)
    if not m:
        return []
    rest = insert_sql[m.end():]

    rows = []
    i = 0
    n = len(rest)

    while i < n:
        # Skip whitespace and commas between rows
        while i < n and rest[i] in (' ', '\t', '\n', '\r', ','):
            i += 1
        if i >= n or rest[i] != '(':
            break
        i += 1  # skip (

        row = []
        while i < n and rest[i] != ')':
            # Skip whitespace between values
            while i < n and rest[i] in (' ', '\t', '\n', '\r'):
                i += 1
            if i >= n:
                break

            if rest[i] == "'":
                # String value
                i += 1
                val_chars = []
                while i < n:
                    c = rest[i]
                    if c == '\\' and i + 1 < n:
                        nc = rest[i + 1]
                        if nc == 'n':
                            val_chars.append('\n')
                        elif nc == 'r':
                            val_chars.append('\r')
                        elif nc == 't':
                            val_chars.append('\t')
                        elif nc == "'":
                            val_chars.append("'")
                        elif nc == '"':
                            val_chars.append('"')
                        elif nc == '\\':
                            val_chars.append('\\')
                        else:
                            val_chars.append(nc)
                        i += 2
                    elif c == "'":
                        if i + 1 < n and rest[i + 1] == "'":
                            # Escaped single quote ''
                            val_chars.append("'")
                            i += 2
                        else:
                            i += 1
                            break
                    else:
                        val_chars.append(c)
                        i += 1
                row.append(''.join(val_chars))

            elif rest[i:i+4] == 'NULL':
                row.append(None)
                i += 4

            else:
                # Numeric value
                j = i
                while j < n and rest[j] not in (',', ')'):
                    j += 1
                token = rest[i:j].strip()
                try:
                    row.append(int(token))
                except ValueError:
                    try:
                        row.append(float(token))
                    except ValueError:
                        row.append(token)
                i = j

            # Skip comma between values
            while i < n and rest[i] in (' ', '\t', '\n', '\r'):
                i += 1
            if i < n and rest[i] == ',':
                i += 1

        # Skip closing )
        if i < n and rest[i] == ')':
            i += 1

        if row:
            rows.append(tuple(row))

    return rows


# ── Dump extraction ───────────────────────────────────────────────────────────

def find_insert_blocks(content: str, table: str):
    """
    Yield the VALUES portion of each INSERT INTO `table` VALUES (...);
    Uses a character-level parser to correctly handle semicolons inside strings.
    """
    needle = f"INSERT INTO `{table}` VALUES "
    start = 0
    while True:
        pos = content.find(needle, start)
        if pos == -1:
            break
        # Advance past the needle to start of VALUES data
        i = pos + len(needle)
        n = len(content)
        # Scan forward tracking string/escape state until we find the
        # terminating semicolon at statement level
        in_string = False
        depth = 0
        stmt_start = i
        while i < n:
            c = content[i]
            if in_string:
                if c == '\\':
                    i += 2  # skip escaped char
                    continue
                elif c == "'":
                    in_string = False
            else:
                if c == "'":
                    in_string = True
                elif c == '(':
                    depth += 1
                elif c == ')':
                    depth -= 1
                elif c == ';' and depth == 0:
                    yield content[stmt_start:i]
                    start = i + 1
                    break
            i += 1
        else:
            start = i


def extract_table(content: str, table: str):
    """Return list of row tuples for a MySQL table from dump content."""
    rows = []
    for block in find_insert_blocks(content, table):
        rows.extend(parse_insert_values('VALUES ' + block))
    return rows


# ── Schema ────────────────────────────────────────────────────────────────────

SCHEMA = """
PRAGMA foreign_keys = OFF;

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
    status       TEXT
);
CREATE INDEX editions_magazine ON editions(magazine_id);
CREATE INDEX editions_idx      ON editions(idx);

CREATE TABLE editions_images (
    edition_id INTEGER,
    image_id   INTEGER
);

CREATE TABLE authors (
    id          INTEGER PRIMARY KEY,
    firstname   TEXT,
    lastname    TEXT,
    institution TEXT,
    biography   TEXT,
    degree      TEXT,
    email       TEXT,
    slug        TEXT NOT NULL DEFAULT ''
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
    section      TEXT NOT NULL DEFAULT '',
    created_at   INTEGER,
    published_at INTEGER
);
CREATE INDEX articles_edition  ON articles(edition_id);
CREATE INDEX articles_magazine ON articles(magazine_id);
CREATE INDEX articles_author   ON articles(author_id);

CREATE TABLE articleabstracts (
    id          INTEGER PRIMARY KEY,
    article_id  INTEGER NOT NULL,
    language_id INTEGER NOT NULL,
    abstract    TEXT
);
CREATE INDEX abstracts_article ON articleabstracts(article_id);

CREATE TABLE articlepages (
    id          INTEGER PRIMARY KEY,
    article_id  INTEGER NOT NULL,
    pagenum     INTEGER,
    title       TEXT,
    location    TEXT,
    date        TEXT,
    text        TEXT
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

CREATE TABLE images (
    id        INTEGER PRIMARY KEY,
    src       TEXT,
    is_cover  INTEGER,
    img_order INTEGER,
    source    TEXT,
    credit    TEXT
);

CREATE TABLE articles_images (
    article_id INTEGER NOT NULL,
    image_id   INTEGER NOT NULL,
    PRIMARY KEY (article_id, image_id)
);
CREATE INDEX articles_images_article ON articles_images(article_id);

CREATE TABLE captions (
    id          INTEGER PRIMARY KEY,
    image_id    INTEGER NOT NULL,
    language_id INTEGER NOT NULL,
    caption     TEXT
);
CREATE INDEX captions_image ON captions(image_id);
"""


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print(f"Reading {DUMP}...")
    with open(DUMP, encoding='utf-8', errors='replace') as f:
        content = f.read()
    print(f"  {len(content):,} bytes loaded")

    if os.path.exists(DB):
        bak = DB + '.bak'
        os.rename(DB, bak)
        print(f"Backed up existing DB → {bak}")

    con = sqlite3.connect(DB)
    con.execute('PRAGMA journal_mode = DELETE')
    con.execute('PRAGMA synchronous = NORMAL')
    con.execute('PRAGMA foreign_keys = OFF')
    con.executescript(SCHEMA)
    con.commit()
    print("Schema created.")

    # ── magazines ──────────────────────────────────────────────────────────
    # MySQL cols: id, title, issn, language_id, status, created_at, creator
    seen_mag = set()
    mags = []
    for r in extract_table(content, 'magazines'):
        mid, title, issn, lang_id, status = r[0], r[1], r[2], r[3], r[4]
        if mid in seen_mag:
            continue
        seen_mag.add(mid)
        issn_str = f"ISSN {issn}" if issn else None
        mags.append((mid, title, issn_str, str(status) if status is not None else None))
    con.executemany('INSERT INTO magazines VALUES (?,?,?,?)', mags)
    print(f"  magazines:  {len(mags)} rows")

    # ── editions ───────────────────────────────────────────────────────────
    # MySQL cols: id, magazine_id, index, legend, created_at, creator,
    #             updated_at, updator, published_at, status
    seen_ed = set()
    eds = []
    for r in extract_table(content, 'editions'):
        eid, mag_id, idx, legend, created, creator, updated, updator, pub, status = \
            r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9]
        if eid in seen_ed:
            continue
        seen_ed.add(eid)
        eds.append((eid, mag_id, idx or '', pub, str(status) if status is not None else None))
    con.executemany('INSERT INTO editions VALUES (?,?,?,?,?)', eds)
    print(f"  editions:   {len(eds)} rows")

    # ── editions_images ────────────────────────────────────────────────────
    # MySQL cols: edition_id, image_id
    ei_rows = [(r[0], r[1]) for r in extract_table(content, 'editions_images')]
    con.executemany('INSERT INTO editions_images VALUES (?,?)', ei_rows)
    print(f"  editions_images: {len(ei_rows)} rows")

    # ── authors ────────────────────────────────────────────────────────────
    # MySQL cols: id, firstname, lastname, birthdate, email, biography,
    #             degree, institution, user_id, is_author, is_revisor,
    #             created_at, updated_at
    def col(r, i):
        return r[i] if len(r) > i else None

    seen_au = set()
    aus = []
    skipped_au = 0
    for r in extract_table(content, 'authors'):
        if len(r) < 3:
            skipped_au += 1
            continue
        aid = r[0]
        if aid in seen_au:
            continue
        seen_au.add(aid)
        firstname   = col(r, 1)
        lastname    = col(r, 2)
        email       = col(r, 4)
        bio         = col(r, 5)
        degree      = col(r, 6)
        institution = col(r, 7)
        full = ((firstname or '') + ' ' + (lastname or '')).strip()
        slug = slugify(full)
        aus.append((aid, firstname, lastname, institution, bio, degree, email, slug))
    con.executemany('INSERT INTO authors VALUES (?,?,?,?,?,?,?,?)', aus)
    print(f"  authors:    {len(aus)} rows (skipped {skipped_au} malformed)")

    # ── articles ───────────────────────────────────────────────────────────
    # MySQL cols: id, author_id, co_authors, magazine_id, edition_id, index,
    #   section, title, first_page_title, short_title, subtitle, lead, text,
    #   isbn, comment, status, created_at, creator, updated_at, updator,
    #   published_at, language_id, returns, old_address, font, font_location,
    #   location, [possibly more]
    seen_ar = set()
    arts = []
    skipped_ar = 0
    for r in extract_table(content, 'articles'):
        if len(r) < 13:
            skipped_ar += 1
            continue
        aid = r[0]
        if aid in seen_ar:
            continue
        seen_ar.add(aid)
        author_id  = col(r, 1) if col(r, 1) != 0 else None
        mag_id     = col(r, 3)
        ed_id      = col(r, 4)
        idx        = col(r, 5)
        section    = col(r, 6) or ''
        title      = col(r, 7)
        subtitle   = col(r, 10)
        lead       = col(r, 11)
        text       = col(r, 12)
        status_raw = col(r, 15)
        status     = str(status_raw) if status_raw is not None else None
        created_at = col(r, 16)
        pub_at     = col(r, 20)
        arts.append((aid, mag_id, ed_id, author_id, idx, title, subtitle,
                     lead, text, status, section, created_at, pub_at))
    con.executemany(
        'INSERT INTO articles VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', arts)
    print(f"  articles:   {len(arts)} rows (skipped {skipped_ar} malformed)")

    # ── articleabstracts ───────────────────────────────────────────────────
    # MySQL cols: id, article_id, abstract, language_id
    absts = [(r[0], r[1], r[3], r[2]) for r in extract_table(content, 'articleabstracts')]
    con.executemany('INSERT INTO articleabstracts VALUES (?,?,?,?)', absts)
    print(f"  articleabstracts: {len(absts)} rows")

    # ── articlepages ───────────────────────────────────────────────────────
    # MySQL cols: id, article_id, title, subtitle, project_title,
    #   project_subtitle, location, date, text, font, font_location, pagenum
    pages = []
    for r in extract_table(content, 'articlepages'):
        pages.append((r[0], r[1], r[11], r[2], r[6], r[7], r[8]))
    con.executemany('INSERT INTO articlepages VALUES (?,?,?,?,?,?,?)', pages)
    print(f"  articlepages: {len(pages)} rows")

    # ── tags (join tag_versions language_id=1) ─────────────────────────────
    # tag_versions cols: id, tag_id, language_id, label
    tv_rows = extract_table(content, 'tag_versions')
    tag_map = {}  # tag_id → label (prefer language_id=1)
    for r in tv_rows:
        _, tag_id, lang_id, label = r[0], r[1], r[2], r[3]
        if lang_id == 1 or tag_id not in tag_map:
            tag_map[tag_id] = label
    # tags cols: id, tag_id, tag_category_id  (id = the PK, tag_id = FK to tag_versions)
    tags_raw = extract_table(content, 'tags')
    tags = []
    for r in tags_raw:
        tid, tag_fk = r[0], r[1]
        label = tag_map.get(tag_fk) or tag_map.get(tid) or ''
        if label:
            tags.append((tid, label))
    con.executemany('INSERT INTO tags VALUES (?,?)', tags)
    print(f"  tags:       {len(tags)} rows")

    # ── articles_tags ──────────────────────────────────────────────────────
    at_rows = list({(r[0], r[1]) for r in extract_table(content, 'articles_tags')})
    con.executemany('INSERT OR IGNORE INTO articles_tags VALUES (?,?)', at_rows)
    print(f"  articles_tags: {len(at_rows)} rows")

    # ── projectauthors ─────────────────────────────────────────────────────
    # MySQL cols: id, firstname, lastname, birthdate, deathdate, biography,
    #   email, phone, created_at, creator, updated_at, updator
    pas = [(r[0], r[1], r[2], r[6]) for r in extract_table(content, 'projectauthors')]
    con.executemany('INSERT INTO projectauthors VALUES (?,?,?,?)', pas)
    print(f"  projectauthors: {len(pas)} rows")

    # ── articles_projectauthors ────────────────────────────────────────────
    apa = list({(r[0], r[1]) for r in extract_table(content, 'articles_projectauthors') if r[0] and r[1]})
    con.executemany('INSERT OR IGNORE INTO articles_projectauthors VALUES (?,?)', apa)
    print(f"  articles_projectauthors: {len(apa)} rows")

    # ── images ─────────────────────────────────────────────────────────────
    # MySQL cols: id, filename, fileext, filepath, is_cover, status, order,
    #   source, credit
    imgs = []
    for r in extract_table(content, 'images'):
        iid      = r[0]
        filename = r[1]
        filepath = r[3]
        is_cover = 1 if str(r[4]) == '1' else 0
        img_ord  = r[6]
        source   = r[7]
        credit   = r[8]
        src = f"{filepath}/{filename}" if filepath and filename else None
        imgs.append((iid, src, is_cover, img_ord, source, credit))
    con.executemany('INSERT INTO images VALUES (?,?,?,?,?,?)', imgs)
    print(f"  images:     {len(imgs)} rows")

    # ── captions ───────────────────────────────────────────────────────────
    # MySQL cols: id, image_id, language_id, caption
    seen_cap = set()
    caps = []
    for r in extract_table(content, 'captions'):
        key = (r[0], r[2])
        if key in seen_cap:
            continue
        seen_cap.add(key)
        caps.append((r[0], r[1], r[2], r[3]))
    con.executemany('INSERT INTO captions VALUES (?,?,?,?)', caps)
    print(f"  captions:   {len(caps)} rows")

    # ── articles_images ────────────────────────────────────────────────────
    ai_rows = list({(r[0], r[1]) for r in extract_table(content, 'articles_images')})
    con.executemany('INSERT OR IGNORE INTO articles_images VALUES (?,?)', ai_rows)
    print(f"  articles_images: {len(ai_rows)} rows")

    con.commit()
    print("Vacuuming...")
    con.execute('VACUUM')
    con.close()
    print(f"\nDone → {DB}")


if __name__ == '__main__':
    main()
