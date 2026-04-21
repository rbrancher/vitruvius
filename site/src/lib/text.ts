import type { Image } from './db.js';

/**
 * Strip all HTML tags, returning plain text suitable for <title> and meta tags.
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&ldquo;/g, '\u201C').replace(/&rdquo;/g, '\u201D')
    .replace(/&lsquo;/g, '\u2018').replace(/&rsquo;/g, '\u2019')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é').replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó').replace(/&uacute;/g, 'ú').replace(/&atilde;/g, 'ã')
    .replace(/&otilde;/g, 'õ').replace(/&ccedil;/g, 'ç').replace(/&agrave;/g, 'à')
    .replace(/&acirc;/g, 'â').replace(/&ecirc;/g, 'ê').replace(/&ocirc;/g, 'ô')
    .replace(/&uuml;/g, 'ü').replace(/&iuml;/g, 'ï').replace(/&ntilde;/g, 'ñ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Build a URL for an image variant.
 * src is stored as "media/images/magazines/filename.jpg"
 * Variants live at "media/images/magazines/{size}/filename.jpg"
 * Size options: grid_1..grid_16, gallery_thumb, originals
 */
const R2_BASE = 'https://pub-b2c5a3f3806a4e169a40d2daa5f0f7ad.r2.dev';

export function imageUrl(src: string | null | undefined, size = 'grid_9'): string {
  if (!src) return '';
  const slash = src.lastIndexOf('/');
  if (slash === -1) return `${R2_BASE}/${src}`;
  const dir = src.slice(0, slash);
  const file = src.slice(slash + 1);
  return `${R2_BASE}/${dir}/${size}/${file}`;
}

/**
 * Process article body HTML:
 * 1. Replace {--image:ID--} placeholders with inline <figure> elements
 * 2. Unwrap <span class="text"> noise from the CMS
 * 3. Convert <span class="text citation"> to <blockquote>
 */
export function processArticleBody(
  html: string | null | undefined,
  imageMap: Map<number, Image>
): string {
  if (!html) return '';

  let out = html;

  // Unescape PHP addslashes() / magic_quotes artifacts stored in DB
  out = out.replace(/\\"/g, '"').replace(/\\'/g, '\u2019').replace(/\\\\/g, '\\');

  // Rewrite internal ?page=N links to absolute sub-path URLs
  // Handles both relative (../../revistas/read/...) and absolute (/revistas/read/...) hrefs
  out = out.replace(
    /href="[^"]*revistas\/read\/([^"/?]+)\/([^"/?]+)\/([^"/?]+)\?page=(\d+)"/gi,
    (_, mag, ed, id, page) => {
      const base = `/revistas/read/${mag}/${ed}/${id}`;
      return `href="${Number(page) > 1 ? `${base}/${page}` : base}"`;
    }
  );

  // Replace image placeholders with grid_9 variant (528px — main content column width)
  out = out.replace(/\{--image:(\d+)--\}/g, (_, idStr) => {
    const id = Number(idStr);
    const img = imageMap.get(id);
    if (!img?.src) return '';
    const caption = img.caption || img.credit || '';
    return `<figure class="inline-figure">
  <img src="${imageUrl(img.src, 'grid_9')}" alt="${escAttr(caption)}" loading="lazy" />
  ${caption ? `<figcaption>${escHtml(caption)}</figcaption>` : ''}
</figure>`;
  });

  // Unwrap <p> tags that contain only a figure (block inside inline → empty p artifact)
  out = out.replace(/<p[^>]*>\s*(<figure[\s\S]*?<\/figure>)\s*<\/p>/gi, '$1');

  // Convert citation spans to blockquote
  out = out.replace(
    /<span\s+class=["']text\s+citation["']>([\s\S]*?)<\/span>/gi,
    '<blockquote>$1</blockquote>'
  );

  // Strip bare <span class="text"> wrappers (keep inner content)
  out = out.replace(/<span\s+class=["']text["'][^>]*>([\s\S]*?)<\/span>/gi, '$1');

  // Strip remaining generic CMS spans that carry no semantic value
  out = out.replace(/<span\s+class=["'][^"']*["'][^>]*>/gi, '<span>');

  // Collapse consecutive empty paragraphs
  out = out.replace(/(<p>\s*<\/p>\s*){2,}/gi, '<p>&nbsp;</p>');

  return out;
}

function escAttr(s: string): string {
  return s.replace(/&(?![a-zA-Z#][a-zA-Z0-9]*;)/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escHtml(s: string): string {
  return s.replace(/&(?![a-zA-Z#][a-zA-Z0-9]*;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
