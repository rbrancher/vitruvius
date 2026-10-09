import { describe, it, expect } from 'vitest';
import { stripHtml, imageUrl, processArticleBody } from '../../src/lib/text';
import type { Image } from '../../src/lib/db';

const R2 = 'https://pub-b2c5a3f3806a4e169a40d2daa5f0f7ad.r2.dev';

function img(id: number, over: Partial<Image> = {}): Image {
  return { id, src: `media/images/magazines/f${id}.jpg`, is_cover: 0, img_order: 1,
           source: null, credit: null, caption: null, ...over };
}

describe('stripHtml', () => {
  it('removes tags and decodes entities', () => {
    expect(stripHtml('A <em>casa</em> &amp; o &ldquo;jardim&rdquo;&nbsp;&ccedil;')).toBe('A casa & o “jardim” ç');
  });
  it('handles empty input', () => {
    expect(stripHtml(null)).toBe('');
    expect(stripHtml(undefined)).toBe('');
  });
  it('decodes numeric entities and collapses whitespace', () => {
    expect(stripHtml('a&#233;\n\n  b')).toBe('aé b');
  });
});

describe('imageUrl', () => {
  it('inserts the size folder before the file name', () => {
    expect(imageUrl('media/images/magazines/x.jpg')).toBe(`${R2}/media/images/magazines/grid_9/x.jpg`);
    expect(imageUrl('media/images/magazines/x.jpg', 'grid_1')).toBe(`${R2}/media/images/magazines/grid_1/x.jpg`);
  });
  it('handles a bare file name and empty input', () => {
    expect(imageUrl('x.jpg')).toBe(`${R2}/x.jpg`);
    expect(imageUrl(null)).toBe('');
  });
});

describe('processArticleBody', () => {
  it('replaces image placeholders with a figure and unwraps the surrounding <p>', () => {
    const out = processArticleBody('<p>{--image:1--}</p>', new Map([[1, img(1, { caption: 'Planta' })]]));
    expect(out).toContain('<figure class="inline-figure">');
    expect(out).toContain(`src="${R2}/media/images/magazines/grid_9/f1.jpg"`);
    expect(out).toContain('<figcaption>Planta</figcaption>');
    expect(out).not.toMatch(/<p>\s*<figure/);
  });

  it('keeps HTML in captions as markup, and strips it from the alt text', () => {
    // Regression: "Fix HTML tags showing in image captions"
    const out = processArticleBody('{--image:1--}', new Map([[1, img(1, { caption: 'Edifício <em>Copan</em>' })]]));
    expect(out).toContain('<figcaption>Edifício <em>Copan</em></figcaption>');
    expect(out).toContain('alt="Edifício Copan"');
    expect(out).not.toContain('&lt;em&gt;');
  });

  it('falls back to the credit when there is no caption', () => {
    const out = processArticleBody('{--image:1--}', new Map([[1, img(1, { credit: 'Foto X' })]]));
    expect(out).toContain('<figcaption>Foto X</figcaption>');
  });

  it('drops placeholders for unknown images', () => {
    expect(processArticleBody('a{--image:99--}b', new Map())).toBe('ab');
  });

  it('undoes PHP escaping', () => {
    expect(processArticleBody('<p>\\"x\\" it\\\'s</p>', new Map())).toBe('<p>"x" it’s</p>');
  });

  it('rewrites legacy ?page=N links to sub-paths', () => {
    expect(processArticleBody('<a href="../../revistas/read/projetos/20.230/601?page=3">x</a>', new Map()))
      .toBe('<a href="/revistas/read/projetos/20.230/601/3">x</a>');
    expect(processArticleBody('<a href="/revistas/read/projetos/20.230/601?page=1">x</a>', new Map()))
      .toBe('<a href="/revistas/read/projetos/20.230/601">x</a>');
  });

  it('turns citation spans into blockquotes and unwraps text spans', () => {
    expect(processArticleBody('<span class="text citation">Q</span>', new Map())).toBe('<blockquote>Q</blockquote>');
    expect(processArticleBody('<span class="text">T</span>', new Map())).toBe('T');
  });

  it('collapses runs of empty paragraphs', () => {
    expect(processArticleBody('<p></p><p></p><p></p>', new Map())).toBe('<p>&nbsp;</p>');
  });
});
